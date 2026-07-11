/*
 * 스마트 화장실 키오스크 — NUC120 테스트 펌웨어 (DHT11 온습도 + 릴레이 + LED)
 * BSP: NUC100_Series_BSP_CMSIS_V3.00.007 / Keil + NULink
 *
 * 사용법: UART_TxRx 프로젝트의 main.c 를 '이 파일로 교체' → Build(F7) → Download.
 *   추가 StdDriver 파일 불필요(uart.c/gpio.c/clk.c/sys.c 는 이미 포함됨).
 *
 * 배선:
 *   UART0  : PB.1(TXD0,33)→CH340 RXD, PB.0(RXD0,32)→CH340 TXD, GND 공통
 *   DHT11  : DATA→PB.8(100), VCC→보드 VDD, GND→GND  (3핀 모듈이면 보드 풀업 있음)
 *   릴레이 : IN→PB.2(34)                          (active-low 모듈 가정, 아래 토글로 변경)
 *   LED    : PB.3(35) → 220Ω → GND
 *
 * 동작:
 *   5초마다  ENV,<온도>,<습도>,0.000,0   (DHT11 실측 온습도, 암모니아·먼지는 센서 없어 0)
 *   DISPENSE 수신 → 릴레이 0.7초 ON + LED 점등 → DISP_OK
 */

#include <stdio.h>
#include <string.h>
#include "NUC100Series.h"

/* ── 핀 ─────────────────────────────────────────── */
#define DHT_PIN     PB8          /* DHT11 DATA */
#define RELAY_PIN   PB2
#define LED_PIN     PB3

#define RELAY_ACTIVE_LOW  1       /* 릴레이가 반대로 동작하면 0 으로 */
#if RELAY_ACTIVE_LOW
  #define RELAY_ON()   (RELAY_PIN = 0)
  #define RELAY_OFF()  (RELAY_PIN = 1)
#else
  #define RELAY_ON()   (RELAY_PIN = 1)
  #define RELAY_OFF()  (RELAY_PIN = 0)
#endif
#define LED_ON()   (LED_PIN = 1)
#define LED_OFF()  (LED_PIN = 0)

/* ── UART 수신 라인 ─────────────────────────────── */
static char rxLine[64]; static uint8_t rxLen = 0;
static volatile uint8_t lineReady = 0; static char cmd[64];

/* ARM 코어 SysTick 직접 사용 (BSP 함수 CLK_SysTickDelay 의존 제거 — 어떤 BSP에서도 컴파일됨) */
static void delay_us(uint32_t us){
    SysTick->LOAD = us * (SystemCoreClock/1000000) - 1;   /* 24bit: 최대 ~335ms @50MHz */
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk;
    while(!(SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk)){}
    SysTick->CTRL = 0;
}
static void delay_ms(uint32_t ms){ while(ms--) delay_us(1000); }

static void uart_puts(const char *s){
    while(*s){ while(UART0->FSR & UART_FSR_TX_FULL_Msk){} UART0->DATA = *s++; }
}
void UART02_IRQHandler(void){   /* NUC120: UART0/UART2 공유 인터럽트 */
    while(!(UART0->FSR & UART_FSR_RX_EMPTY_Msk)){
        char c = UART0->DATA;
        if(c=='\r') continue;
        if(c=='\n'){ rxLine[rxLen]=0; strcpy(cmd,rxLine); rxLen=0; lineReady=1; }
        else if(rxLen < sizeof(rxLine)-1){ rxLine[rxLen++]=c; }
    }
}

/* ── DHT11 읽기 (1-wire 비트뱅) ──────────────────── */
static uint8_t dht[5];
static int dht_read(void){
    uint32_t t;
    /* 1) 스타트: 18ms 이상 LOW → 30us HIGH → 입력 전환 */
    GPIO_SetMode(PB, BIT8, GPIO_PMD_OUTPUT);
    DHT_PIN = 0; delay_ms(20);
    DHT_PIN = 1; delay_us(30);
    GPIO_SetMode(PB, BIT8, GPIO_PMD_INPUT);   /* 모듈/외부 풀업 필요 */
    /* 2) 응답: LOW 80us → HIGH 80us */
    t=0; while(DHT_PIN!=0){ if(++t>100000) return 0; }   /* DHT LOW 시작 대기 */
    t=0; while(DHT_PIN==0){ if(++t>100000) return 0; }   /* 80us LOW */
    t=0; while(DHT_PIN!=0){ if(++t>100000) return 0; }   /* 80us HIGH */
    /* 3) 40비트 수신: 50us LOW 후 HIGH 폭으로 0/1 판별 */
    for(int i=0;i<5;i++) dht[i]=0;
    for(int i=0;i<40;i++){
        t=0; while(DHT_PIN==0){ if(++t>100000) return 0; }  /* 50us LOW → 상승엣지 */
        delay_us(40);                                        /* 40us 후 샘플 */
        int bit = (DHT_PIN!=0) ? 1 : 0;                      /* HIGH면 1(70us), LOW면 0(28us) */
        dht[i/8] = (uint8_t)((dht[i/8]<<1) | bit);
        t=0; while(DHT_PIN!=0){ if(++t>100000) return 0; }  /* HIGH 종료 대기 */
    }
    /* 4) 체크섬 */
    if((uint8_t)(dht[0]+dht[1]+dht[2]+dht[3]) != dht[4]) return 0;
    return 1;   /* dht[0]=습도(%), dht[2]=온도(℃) — DHT11은 정수 */
}

/* ── 시스템 초기화 ──────────────────────────────── */
static void SYS_Init(void){
    SYS_UnlockReg();
    CLK_EnableXtalRC(CLK_PWRCON_XTL12M_EN_Msk);
    CLK_WaitClockReady(CLK_CLKSTATUS_XTL12M_STB_Msk);
    CLK_SetCoreClock(50000000);
    CLK_EnableModuleClock(UART0_MODULE);
    CLK_SetModuleClock(UART0_MODULE, CLK_CLKSEL1_UART_S_HXT, CLK_CLKDIV_UART(1));
    SYS->GPB_MFP |= (SYS_GPB_MFP_PB0_UART0_RXD | SYS_GPB_MFP_PB1_UART0_TXD);
    SystemCoreClockUpdate();      /* CLK_SysTickDelay 기준 클럭 갱신 */
    SYS_LockReg();
}

int main(void){
    SYS_Init();
    UART_Open(UART0, 115200);
    UART_EnableInt(UART0, UART_IER_RDA_IEN_Msk);
    NVIC_EnableIRQ(UART02_IRQn);

    /* 릴레이·LED 출력, DHT 초기 HIGH */
    GPIO_SetMode(PB, BIT2|BIT3, GPIO_PMD_OUTPUT);
    RELAY_OFF(); LED_OFF();
    GPIO_SetMode(PB, BIT8, GPIO_PMD_OUTPUT); DHT_PIN = 1;

    uart_puts("READY\n");

    float temp = 0, humi = 0;
    uint32_t tick = 0;

    while(1){
        /* 명령 처리 (DISPENSE → 릴레이 딸깍) */
        if(lineReady){
            lineReady = 0;
            if(strcmp(cmd,"DISPENSE")==0){
                LED_ON(); RELAY_ON();
                delay_ms(700);
                RELAY_OFF(); LED_OFF();
                uart_puts("DISP_OK\n");
            }
        }
        /* 100ms 틱 × 50 = 5초마다 ENV 송신 */
        delay_ms(100); tick++;
        if(tick >= 50){
            tick = 0;
            if(dht_read()){ humi = dht[0]; temp = dht[2]; }   /* 실패 시 직전값 유지 */
            char buf[48];
            sprintf(buf, "ENV,%.1f,%.0f,0.000,0\n", temp, humi);
            uart_puts(buf);
            LED_ON(); delay_ms(30); LED_OFF();                /* 송신 하트비트 깜빡 */
        }
    }
}
