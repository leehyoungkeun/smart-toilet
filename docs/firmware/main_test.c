/*
 * ============================================================================
 *  스마트 화장실 키오스크 — NUC120 테스트 펌웨어
 *  (DHT11 온습도 측정 + 릴레이(배출기 대체) + 상태 LED)
 * ----------------------------------------------------------------------------
 *  대상 보드 : NuTiny-EVB-NUC120-LQFP100 (MCU: NUC120VE3DN, Cortex-M0, 50MHz)
 *  개발 환경 : Keil uVision + Nu-Link,  BSP: NUC100_Series_BSP_CMSIS_V3.00.007
 *
 *  [역할]
 *   - 5초마다 DHT11로 온도/습도를 실측해 UART로 "ENV,..." 문자열 전송
 *   - 태블릿/PC가 "DISPENSE" 명령을 보내면 릴레이를 0.7초 동작(모터 배출 흉내) 후 "DISP_OK" 회신
 *   - 암모니아/미세먼지는 아직 센서 미장착이라 0 으로 보냄 (추후 ADC 센서로 교체)
 *
 *  [배선]  (LQFP100 핀번호)
 *   - UART0 : PB.1(TXD0,33핀) -> CH340 RXD,  PB.0(RXD0,32핀) -> CH340 TXD,  GND 공통
 *   - DHT11 : DATA -> PB.8(100핀),  VCC -> 보드 VDD,  GND -> GND  (3핀 모듈은 자체 풀업 있음)
 *   - 릴레이: IN  -> PB.2(34핀),  VCC -> 5V,  GND 공통
 *   - LED   : PB.3(35핀) -> 220옴 저항 -> GND
 *
 *  [통신 프로토콜]  115200bps, 8데이터, 무패리티, 1스톱(8N1), 한 줄 단위(\n)
 *   보드 -> 상대 : "READY"                      (부팅 완료)
 *                : "ENV,온도,습도,암모니아,미세먼지"  (5초 주기, 예: ENV,24.0,51,0.000,0)
 *                : "DISP_OK"                     (배출 성공)
 *                : "DISP_ERR,사유"                (배출 실패)
 *   상대 -> 보드 : "DISPENSE"                    (1회 배출 명령)
 * ============================================================================
 */

#include <stdio.h>
#include <string.h>
#include "NUC100Series.h"   /* NUC120은 NUC100 시리즈 계열이라 이 헤더를 씀 (NuMicro.h 아님) */

/* ── 사용 핀 정의 ────────────────────────────────────────────────────────────
 *  PB8/PB2/PB3 은 NUC100Series.h 에 정의된 '비트밴드' 매크로라
 *  PB8 = 1;  처럼 핀 하나를 직접 읽고 쓸 수 있다.
 */
#define DHT_PIN     PB8          /* DHT11 데이터선 */
#define RELAY_PIN   PB2          /* 릴레이 IN */
#define LED_PIN     PB3          /* 상태 LED */

/* 릴레이 모듈 극성: 대부분의 파란 릴레이 모듈은 'active-low'(IN=LOW 일 때 ON).
 * 만약 반대로 동작(평소 켜져 있음)하면 아래 값을 0 으로 바꿔 재빌드하면 된다. */
#define RELAY_ACTIVE_LOW  1
#if RELAY_ACTIVE_LOW
  #define RELAY_ON()   (RELAY_PIN = 0)   /* ON  = LOW 출력 */
  #define RELAY_OFF()  (RELAY_PIN = 1)   /* OFF = HIGH 출력 */
#else
  #define RELAY_ON()   (RELAY_PIN = 1)
  #define RELAY_OFF()  (RELAY_PIN = 0)
#endif
#define LED_ON()   (LED_PIN = 1)         /* LED ON  (핀 HIGH) */
#define LED_OFF()  (LED_PIN = 0)         /* LED OFF (핀 LOW)  */

/* ── UART 수신 버퍼 ──────────────────────────────────────────────────────────
 *  수신은 인터럽트로 한 글자씩 모아 '\n'(줄바꿈)을 만나면 한 줄(cmd)로 완성한다.
 *  lineReady 가 1 이 되면 메인 루프가 그 줄을 처리한다.
 */
static char rxLine[64];              /* 조립 중인 한 줄 */
static uint8_t rxLen = 0;            /* 현재 길이 */
static volatile uint8_t lineReady = 0;  /* 한 줄 완성 플래그 (인터럽트가 세움) */
static char cmd[64];                 /* 완성된 명령 문자열 */

/* ── 마이크로초/밀리초 지연 ─────────────────────────────────────────────────
 *  ARM 코어에 내장된 SysTick 타이머를 '한 번 세는' 방식으로 직접 사용한다.
 *  (BSP의 CLK_SysTickDelay 는 이 구버전 BSP에 없어 빌드 오류를 내므로 쓰지 않음)
 *  - LOAD 에 (지연 us x 1MHz당 클럭수)-1 을 넣고, 다 셀 때까지(COUNTFLAG) 기다린다.
 *  - 24비트 카운터라 50MHz에서 한 번에 최대 약 335ms 까지 지연 가능.
 */
static void delay_us(uint32_t us){
    SysTick->LOAD = us * (SystemCoreClock/1000000) - 1;
    SysTick->VAL  = 0;                                         /* 카운터 초기화 */
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk; /* 코어클럭으로 시작 */
    while(!(SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk)){}     /* 다 셀 때까지 대기 */
    SysTick->CTRL = 0;                                         /* 정지 */
}
static void delay_ms(uint32_t ms){ while(ms--) delay_us(1000); }  /* 1ms 씩 반복 */

/* ── UART 문자열 송신 ──────────────────────────────────────────────────────
 *  TX FIFO가 가득 차 있으면 빌 때까지 기다렸다가 한 글자씩 내보낸다.
 */
static void uart_puts(const char *s){
    while(*s){
        while(UART0->FSR & UART_FSR_TX_FULL_Msk){}   /* 송신버퍼 여유 대기 */
        UART0->DATA = *s++;                          /* 한 글자 전송 */
    }
}

/* ── UART0 수신 인터럽트 핸들러 ─────────────────────────────────────────────
 *  ※ NUC120은 UART0과 UART2가 '같은 인터럽트'를 공유하므로
 *    핸들러 이름이 반드시 UART02_IRQHandler 여야 실제로 호출된다.(중요)
 *  받은 글자를 rxLine 에 모으고, '\n' 을 만나면 한 줄 완성 플래그를 세운다.
 */
void UART02_IRQHandler(void){
    while(!(UART0->FSR & UART_FSR_RX_EMPTY_Msk)){    /* 받을 게 있는 동안 */
        char c = UART0->DATA;                        /* 한 글자 읽기 */
        if(c=='\r') continue;                        /* 캐리지리턴 무시 */
        if(c=='\n'){                                 /* 줄 끝 → 한 줄 완성 */
            rxLine[rxLen]=0; strcpy(cmd,rxLine); rxLen=0; lineReady=1;
        } else if(rxLen < sizeof(rxLine)-1){         /* 버퍼 넘치지 않게 저장 */
            rxLine[rxLen++]=c;
        }
    }
}

/* ── DHT11 온습도 읽기 (1-wire 비트뱅) ─────────────────────────────────────
 *  DHT11은 한 가닥 신호선으로 통신하는 저가 온습도 센서.
 *  통신 절차:
 *   1) MCU가 18ms 이상 LOW 로 시작신호 → 짧게 HIGH → 입력으로 전환
 *   2) 센서가 응답: 80us LOW → 80us HIGH
 *   3) 40비트 데이터: 각 비트마다 50us LOW 후, HIGH 길이로 0/1 판별
 *      (HIGH가 약 28us면 '0', 약 70us면 '1')
 *   4) 5바이트: [습도정수][습도소수][온도정수][온도소수][체크섬]
 *      DHT11은 소수부가 0 → dht[0]=습도(%), dht[2]=온도(℃)
 *  반환: 1=성공, 0=실패(체크섬 불일치/무응답 등). 실패 시 이전 값 유지.
 */
static uint8_t dht[5];
static int dht_read(void){
    uint32_t t;
    /* --- 1) 시작 신호 --- */
    GPIO_SetMode(PB, BIT8, GPIO_PMD_OUTPUT);   /* 출력으로 */
    DHT_PIN = 0; delay_ms(20);                 /* 20ms LOW (규격 18ms 이상) */
    DHT_PIN = 1; delay_us(30);                 /* 잠깐 HIGH */
    GPIO_SetMode(PB, BIT8, GPIO_PMD_INPUT);    /* 입력으로 전환(센서가 응답하도록) */
    /* --- 2) 센서 응답 대기 (LOW 80us → HIGH 80us) --- */
    t=0; while(DHT_PIN!=0){ if(++t>100000) return 0; }   /* 센서가 LOW로 끌 때까지 */
    t=0; while(DHT_PIN==0){ if(++t>100000) return 0; }   /* 80us LOW 끝 대기 */
    t=0; while(DHT_PIN!=0){ if(++t>100000) return 0; }   /* 80us HIGH 끝 대기 */
    /* --- 3) 40비트 수신 --- */
    for(int i=0;i<5;i++) dht[i]=0;
    for(int i=0;i<40;i++){
        t=0; while(DHT_PIN==0){ if(++t>100000) return 0; } /* 50us LOW 지나 상승엣지까지 */
        delay_us(40);                                      /* 상승 후 40us 뒤에 샘플 */
        int bit = (DHT_PIN!=0) ? 1 : 0;                    /* 아직 HIGH면 1(70us), LOW면 0(28us) */
        dht[i/8] = (uint8_t)((dht[i/8]<<1) | bit);         /* MSB부터 채움 */
        t=0; while(DHT_PIN!=0){ if(++t>100000) return 0; } /* HIGH 끝(다음 비트 준비)까지 */
    }
    /* --- 4) 체크섬 검증 --- */
    if((uint8_t)(dht[0]+dht[1]+dht[2]+dht[3]) != dht[4]) return 0;
    return 1;
}

/* ── 시스템 클럭/UART 핀 초기화 ─────────────────────────────────────────────
 *  - 외부 12MHz 크리스털(HXT)로 PLL 돌려 코어 50MHz 설정
 *  - UART0 클럭 켜고, PB.0/PB.1 을 UART0 RXD/TXD 기능으로 지정
 */
static void SYS_Init(void){
    SYS_UnlockReg();                                      /* 보호 레지스터 잠금 해제 */
    CLK_EnableXtalRC(CLK_PWRCON_XTL12M_EN_Msk);           /* 외부 12MHz 크리스털 ON */
    CLK_WaitClockReady(CLK_CLKSTATUS_XTL12M_STB_Msk);     /* 안정될 때까지 대기 */
    CLK_SetCoreClock(50000000);                           /* 코어(HCLK) 50MHz */
    CLK_EnableModuleClock(UART0_MODULE);                  /* UART0 클럭 공급 */
    CLK_SetModuleClock(UART0_MODULE, CLK_CLKSEL1_UART_S_HXT, CLK_CLKDIV_UART(1)); /* UART 클럭원=HXT */
    /* 멀티펑션핀: PB.0=UART0 RXD, PB.1=UART0 TXD 로 설정 */
    SYS->GPB_MFP |= (SYS_GPB_MFP_PB0_UART0_RXD | SYS_GPB_MFP_PB1_UART0_TXD);
    SystemCoreClockUpdate();                              /* SystemCoreClock 갱신(지연함수 기준) */
    SYS_LockReg();                                        /* 보호 레지스터 다시 잠금 */
}

/* ── 메인 ───────────────────────────────────────────────────────────────── */
int main(void){
    SYS_Init();                                           /* 클럭/핀 설정 */
    UART_Open(UART0, 115200);                             /* UART0 115200bps 열기 */
    UART_EnableInt(UART0, UART_IER_RDA_IEN_Msk);          /* 수신 인터럽트 허용 */
    NVIC_EnableIRQ(UART02_IRQn);                          /* (NUC120: UART0/2 공유 벡터) */

    /* 릴레이/LED 핀 출력 설정, 시작 상태 = OFF */
    GPIO_SetMode(PB, BIT2|BIT3, GPIO_PMD_OUTPUT);
    RELAY_OFF(); LED_OFF();
    /* DHT 핀은 평소 HIGH 로 대기 */
    GPIO_SetMode(PB, BIT8, GPIO_PMD_OUTPUT); DHT_PIN = 1;

    uart_puts("READY\n");                                 /* 부팅 완료 알림 */

    float temp = 0, humi = 0;                             /* 마지막으로 읽은 온습도 */
    uint32_t tick = 0;                                    /* 100ms 틱 카운터 */

    while(1){
        /* (1) 명령 처리: DISPENSE 를 받으면 릴레이 0.7초 동작 + LED */
        if(lineReady){
            lineReady = 0;
            if(strcmp(cmd,"DISPENSE")==0){
                LED_ON(); RELAY_ON();      /* 릴레이 ON (모터 배출 시작) */
                delay_ms(700);             /* 0.7초 동안 유지 */
                RELAY_OFF(); LED_OFF();    /* 릴레이 OFF (정지) */
                uart_puts("DISP_OK\n");    /* 배출 완료 회신 */
            }
        }
        /* (2) 100ms 마다 틱을 세고, 50번(=5초)마다 온습도 측정·전송
         *     - delay_ms(100) 동안에도 수신은 인터럽트로 계속 처리됨 */
        delay_ms(100); tick++;
        if(tick >= 50){
            tick = 0;
            if(dht_read()){ humi = dht[0]; temp = dht[2]; } /* 성공 시 값 갱신, 실패면 이전값 유지 */
            char buf[48];
            /* 형식: ENV,온도,습도,암모니아,미세먼지  (암모니아/먼지는 센서없어 0) */
            sprintf(buf, "ENV,%.1f,%.0f,0.000,0\n", temp, humi);
            uart_puts(buf);
            LED_ON(); delay_ms(30); LED_OFF();              /* 전송 표시로 LED 살짝 깜빡 */
        }
    }
}
