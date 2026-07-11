/*
 * 스마트 화장실 키오스크 — NUC100 (Cortex-M0) 펌웨어 (참조 골격)
 * 역할: 센서 읽기 → UART로 ENV 송신 / 태블릿의 DISPENSE 수신 → 호퍼 모터 1회 구동 + 배출확인
 *
 * 통신 : UART0 @ 115200 8N1  ── CH340 USB-UART ── 태블릿
 * 모터 : TB6612FNG (PWMA/AIN1/AIN2/STBY), 12V DC 기어모터(코일 호퍼)
 * 확인 : 배출구 드롭 광센서 (GPIO, active-low)
 * 센서 : SHT31(I2C 온습도) · MQ-137(ADC 암모니아) · 아날로그 먼지센서(ADC)
 *
 * ※ Nuvoton NuMicro BSP(Keil/NuEclipse) 기준의 '골격'입니다.
 *   레지스터/드라이버 함수명은 사용하는 BSP 버전에 맞게 조정하세요. TODO 표시 부분에 센서 드라이버를 채우면 됩니다.
 */

#include <stdio.h>
#include <string.h>
#include "NuMicro.h"   /* BSP 헤더 (버전에 맞게) */

/* ── 핀 매핑 (보드에 맞게 수정) ─────────────────────────── */
#define MOTOR_STBY   PB2   /* TB6612 STBY */
#define MOTOR_AIN1   PB3   /* TB6612 AIN1 */
#define MOTOR_AIN2   PB4   /* TB6612 AIN2 */
/* PWMA 는 PWM0 채널0 로 출력 (아래 PWM 초기화 참고) */
#define DROP_SENSOR  PB5   /* 배출구 광센서: 통과 시 LOW */
/* MQ-137 → ADC ch0, 먼지센서 → ADC ch1 */

/* ── 파라미터 ──────────────────────────────────────────── */
#define ENV_PERIOD_MS   5000     /* 센서 송신 주기 */
#define DISPENSE_TIMEOUT_MS 4000 /* 배출 미확인 → 잼 판정 */
#define MOTOR_DUTY      70        /* PWM 듀티 % */

/* ── UART 수신 라인 버퍼 ───────────────────────────────── */
static char  rxLine[64];
static uint8_t rxLen = 0;
static volatile uint8_t lineReady = 0;
static char  cmd[64];

static volatile uint32_t g_ms = 0;     /* SysTick 1ms 카운터 */

/* ==== 저수준 유틸 ====================================== */
void SysTick_Handler(void){ g_ms++; }
static uint32_t millis(void){ return g_ms; }

static void uart_puts(const char *s){
    while(*s) UART_WRITE(UART0, *s++);
}
static void uart_printf_env(float t, float h, float a, float p){
    char buf[48];
    /* ENV,온도,습도,암모니아,미세먼지 */
    sprintf(buf, "ENV,%.1f,%.0f,%.3f,%.0f\n", t, h, a, p);
    uart_puts(buf);
}

/* UART0 수신 인터럽트 → 줄 단위로 조립 */
void UART0_IRQHandler(void){
    while(UART_GET_RX_EMPTY(UART0) == 0){
        char c = UART_READ(UART0);
        if(c=='\r') continue;
        if(c=='\n'){ rxLine[rxLen]=0; strcpy(cmd, rxLine); rxLen=0; lineReady=1; }
        else if(rxLen < sizeof(rxLine)-1){ rxLine[rxLen++]=c; }
    }
}

/* ==== 모터 (TB6612) ==================================== */
static void motor_stop(void){
    PWM_SET_CMR(PWM0, 0, 0);       /* 듀티 0 */
    MOTOR_AIN1 = 0; MOTOR_AIN2 = 0;
}
static void motor_forward(void){
    MOTOR_STBY = 1;
    MOTOR_AIN1 = 1; MOTOR_AIN2 = 0;         /* 정방향 */
    /* PWM0 ch0 듀티 설정 (주기 대비 %) — BSP에 맞게 */
    PWM_SET_CMR(PWM0, 0, (PWM_GET_CNR(PWM0,0)+1)*MOTOR_DUTY/100);
}

/* 드롭센서: 배출 감지(하강엣지) 대기, 타임아웃이면 실패 */
static int dispense_one(void){
    uint32_t t0 = millis();
    int seen_high = (DROP_SENSOR != 0);   /* 시작 시 물체 없음(HIGH) */
    motor_forward();
    while(millis() - t0 < DISPENSE_TIMEOUT_MS){
        if(DROP_SENSOR == 0 && seen_high){  /* HIGH→LOW: 생리대 통과 */
            motor_stop();
            return 1;                        /* 성공 */
        }
        if(DROP_SENSOR != 0) seen_high = 1;
    }
    motor_stop();
    return 0;                                /* 타임아웃(잼/빈배출) */
}

/* ==== 센서 (TODO: 실제 드라이버 연결) ================== */
static float read_temp(void){ /* TODO SHT31 I2C */ return 24.5f; }
static float read_humi(void){ /* TODO SHT31 I2C */ return 53.0f; }
static float read_ammonia(void){ /* TODO ADC(MQ-137) → ppm 환산 */ return 0.02f; }
static float read_pm25(void){ /* TODO ADC(먼지센서) → ㎍/㎥ 환산 */ return 12.0f; }

/* ==== 초기화 ========================================== */
static void hw_init(void){
    SYS_UnlockReg();
    /* TODO: 클럭/멀티펑션핀 설정 (SYS_Init) — BSP 예제 참고 */
    /* UART0 115200 8N1 */
    UART_Open(UART0, 115200);
    UART_ENABLE_INT(UART0, UART_INTEN_RDAIEN_Msk);
    NVIC_EnableIRQ(UART0_IRQn);
    /* PWM0 ch0 (모터 PWMA), 20kHz 예시 */
    PWM_ConfigOutputChannel(PWM0, 0, 20000, 0);
    PWM_EnableOutput(PWM0, PWM_CH_0_MASK);
    PWM_Start(PWM0, PWM_CH_0_MASK);
    /* GPIO: 모터 제어핀 출력, 드롭센서 입력(풀업) */
    GPIO_SetMode(PB, BIT2|BIT3|BIT4, GPIO_MODE_OUTPUT);
    GPIO_SetMode(PB, BIT5, GPIO_MODE_INPUT);
    GPIO_SetPullCtl(PB, BIT5, GPIO_PUSEL_PULL_UP);
    /* ADC 초기화 (MQ-137, 먼지) — TODO */
    /* I2C 초기화 (SHT31) — TODO */
    motor_stop();
    SYS_LockReg();
    SysTick_Config(SystemCoreClock/1000);   /* 1ms tick */
}

/* ==== 메인 ============================================ */
int main(void){
    hw_init();
    uart_puts("READY\n");
    uint32_t lastEnv = 0;

    while(1){
        /* 1) 주기적 센서 송신 */
        if(millis() - lastEnv >= ENV_PERIOD_MS){
            lastEnv = millis();
            uart_printf_env(read_temp(), read_humi(), read_ammonia(), read_pm25());
        }
        /* 2) 명령 처리 */
        if(lineReady){
            lineReady = 0;
            if(strcmp(cmd, "DISPENSE") == 0){
                if(dispense_one()) uart_puts("DISP_OK\n");
                else               uart_puts("DISP_ERR,jam\n");
            }
            /* 필요 시 PING/STATUS 등 확장 */
        }
    }
}
