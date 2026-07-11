/*
 * 스마트 화장실 키오스크 — NUC100 완성 펌웨어 v1 (빌드·다운로드용)
 * BSP: NUC100_Series_BSP_CMSIS_V3.00.007  /  Keil µVision + NULink
 *
 * 사용법: UART_TxRx_Function 프로젝트의 main.c 를 '이 파일로 교체' → Build(F7) → Flash Download.
 *   - 의존성 최소화: UART0 + GPIO + SysTick 만 사용 (추가 StdDriver 파일 불필요, 프로젝트 기본 포함분으로 빌드)
 *   - 센서는 더미값(값이 조금씩 변함), 모터는 GPIO 로 TB6612 제어(PWMA 는 HIGH=풀스피드)
 *   - 실제 센서(I2C/ADC)·PWM 속도제어는 v2 에서 추가
 *
 * 통신: 115200 8N1 (CH340 USB-UART → 태블릿/PC)
 *   NUC100 → : READY / ENV,온도,습도,암모니아,미세먼지 (5초) / DISP_OK / DISP_ERR,jam
 *   →NUC100 : DISPENSE
 */

#include <stdio.h>
#include <string.h>
#include "NUC100Series.h"   /* NUC100 BSP V3.00.007 CMSIS 헤더 (M-series의 NuMicro.h 아님) */

/* ── 핀 (보드에 맞게 조정) ─────────────────────────────── */
/* UART0: PB.0=RXD, PB.1=TXD (샘플과 동일) */
#define M_STBY   PB2      /* TB6612 STBY */
#define M_AIN1   PB3      /* TB6612 AIN1 */
#define M_AIN2   PB4      /* TB6612 AIN2 */
#define M_PWMA   PB5      /* TB6612 PWMA (HIGH=풀스피드) */
#define DROP     PB6      /* 배출 드롭센서 (통과 시 LOW) */

#define USE_DROP_SENSOR   0        /* 센서 달면 1 로 */
#define MOTOR_RUN_MS      800      /* 드롭센서 없을 때 고정 구동 시간 */
#define DISPENSE_TIMEOUT_MS 4000
#define ENV_PERIOD_MS     5000

/* ── 전역 ─────────────────────────────────────────────── */
static volatile uint32_t g_ms = 0;
static char rxLine[64]; static uint8_t rxLen = 0;
static volatile uint8_t lineReady = 0; static char cmd[64];

void SysTick_Handler(void){ g_ms++; }
static uint32_t millis(void){ return g_ms; }

/* ── UART ─────────────────────────────────────────────── */
static void uart_puts(const char *s){
    while(*s){ while(UART0->FSR & UART_FSR_TX_FULL_Msk){} UART0->DATA = *s++; }
}
void UART02_IRQHandler(void){   /* NUC100: UART0/UART2 공유 인터럽트 */
    while(!(UART0->FSR & UART_FSR_RX_EMPTY_Msk)){
        char c = UART0->DATA;
        if(c=='\r') continue;
        if(c=='\n'){ rxLine[rxLen]=0; strcpy(cmd,rxLine); rxLen=0; lineReady=1; }
        else if(rxLen < sizeof(rxLine)-1){ rxLine[rxLen++]=c; }
    }
}

/* ── 모터 (GPIO 로 TB6612 제어) ────────────────────────── */
static void motor_stop(void){ M_PWMA=0; M_AIN1=0; M_AIN2=0; M_STBY=0; }
static void motor_forward(void){ M_STBY=1; M_AIN1=1; M_AIN2=0; M_PWMA=1; }

static int dispense_one(void){
    uint32_t t0 = millis();
    motor_forward();
#if USE_DROP_SENSOR
    int seenHigh = (DROP != 0);
    while(millis()-t0 < DISPENSE_TIMEOUT_MS){
        if(DROP != 0) seenHigh = 1;
        if(DROP == 0 && seenHigh){ motor_stop(); return 1; }  /* 배출 감지 */
    }
    motor_stop(); return 0;                                     /* 잼/미배출 */
#else
    while(millis()-t0 < MOTOR_RUN_MS){ }
    motor_stop(); return 1;
#endif
}

/* ── 센서 (더미: 값이 조금씩 변함. v2에서 실제 드라이버로 교체) ── */
static uint32_t sc = 0;
static float read_temp(void){ return 24.0f + (sc%20)*0.1f; }
static float read_humi(void){ return 50.0f + (sc%10); }
static float read_ammonia(void){ return 0.02f + (sc%5)*0.001f; }
static float read_pm25(void){ return 10.0f + (sc%8); }

/* ── 시스템 초기화 (NUC100 표준) ───────────────────────── */
/* ※ 이 SYS_Init 에서 빌드 에러가 나면, UART_TxRx 샘플의 SYS_Init 를 그대로 쓰세요. */
static void SYS_Init(void){
    SYS_UnlockReg();
    CLK_EnableXtalRC(CLK_PWRCON_XTL12M_EN_Msk);            /* HXT 12MHz */
    CLK_WaitClockReady(CLK_CLKSTATUS_XTL12M_STB_Msk);
    CLK_SetCoreClock(50000000);                            /* HCLK 50MHz */
    CLK_EnableModuleClock(UART0_MODULE);
    CLK_SetModuleClock(UART0_MODULE, CLK_CLKSEL1_UART_S_HXT, CLK_CLKDIV_UART(1));
    /* UART0 멀티펑션핀: PB.0=RXD, PB.1=TXD */
    SYS->GPB_MFP |= (SYS_GPB_MFP_PB0_UART0_RXD | SYS_GPB_MFP_PB1_UART0_TXD);
    SystemCoreClockUpdate();
    SYS_LockReg();
}

int main(void){
    SYS_Init();
    UART_Open(UART0, 115200);
    UART_EnableInt(UART0, UART_IER_RDA_IEN_Msk);
    NVIC_EnableIRQ(UART02_IRQn);

    /* 모터 핀 출력, 드롭센서 입력(내부 풀업=QUASI) */
    GPIO_SetMode(PB, BIT2|BIT3|BIT4|BIT5, GPIO_PMD_OUTPUT);
    GPIO_SetMode(PB, BIT6, GPIO_PMD_QUASI);
    motor_stop();

    SysTick_Config(SystemCoreClock/1000);                 /* 1ms tick */

    uart_puts("READY\n");
    uint32_t lastEnv = 0;

    while(1){
        if(millis()-lastEnv >= ENV_PERIOD_MS){
            lastEnv = millis(); sc++;
            char buf[48];
            sprintf(buf,"ENV,%.1f,%.0f,%.3f,%.0f\n",
                    read_temp(), read_humi(), read_ammonia(), read_pm25());
            uart_puts(buf);
        }
        if(lineReady){
            lineReady = 0;
            if(strcmp(cmd,"DISPENSE")==0){
                if(dispense_one()) uart_puts("DISP_OK\n");
                else               uart_puts("DISP_ERR,jam\n");
            }
        }
    }
}
