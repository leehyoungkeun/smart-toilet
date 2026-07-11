# 키오스크 하드웨어 (표준안) — NUC100 + 센서 + 호퍼 모터

태블릿 ↔ NUC100(Cortex‑M0) USB 시리얼로 **센서 수집 + 생리대 호퍼 모터 제어**.

## 구성도
```
[센서] SHT31(온습도,I2C) · MQ-137(암모니아,ADC) · 먼지센서(ADC)
   │
[NUC100] ── UART0(115200) ── CH340 USB-UART ── [태블릿]
   ├ PWM/GPIO → TB6612 → 12V DC기어모터(코일 호퍼) → 생리대 배출
   └ GPIO ← 드롭 광센서(배출 확인)
                                   태블릿 ──LTE── Supabase
```

## BOM (표준)
| 부품 | 예시 | 용도 |
|------|------|------|
| MCU | Nuvoton **NUC100** | 센서·모터 제어 |
| USB 브리지 | **CH340**/CP2102 모듈 | UART→태블릿 USB |
| 모터 드라이버 | **TB6612FNG** | 호퍼 모터 구동 |
| 모터 | 12V **DC 기어모터**(코일/오거) | 생리대 운송 |
| 배출센서 | 광인터럽터(포토 인터럽터) | 낙하 확인 |
| 온습도 | **SHT31**(I2C) | 온도·습도 |
| 암모니아 | **MQ-137**(아날로그) | 악취 |
| 미세먼지 | GP2Y1010 등 아날로그 | PM |
| 전원 | 12V 어댑터 + 12V→3.3/5V 벅 | 모터 12V, 로직 3.3V |
| 태블릿 전원 | **PD 패스스루 OTG 허브** | 충전+USB호스트 동시 |

## 배선 (핀 예시 — 보드에 맞게 조정)
| NUC100 | 연결 |
|--------|------|
| UART0 TXD/RXD | CH340 RXD/TXD |
| I2C SCL/SDA | SHT31 |
| ADC ch0 / ch1 | MQ-137 / 먼지센서 |
| PWM0 ch0 | TB6612 **PWMA** |
| GPIO PB2/PB3/PB4 | TB6612 **STBY/AIN1/AIN2** |
| GPIO PB5 (풀업) | 드롭 광센서 (통과 시 LOW) |
| TB6612 VM / VCC / GND | 12V / 3.3V / 공통 GND |
| TB6612 AO1/AO2 | 모터 +/- |

⚠️ **공통 GND** 필수(NUC100·TB6612·센서·CH340). 모터 12V는 로직과 분리.

## 시리얼 프로토콜 (한 줄씩, 115200 8N1)
```
NUC100 → 태블릿 :  READY                         (부팅)
                :  ENV,24.7,53,0.02,12           (5초마다)
                :  DISP_OK                        (배출 성공)
                :  DISP_ERR,jam                   (잼/미배출)
태블릿 → NUC100 :  DISPENSE                       (1개 배출)
```

## 동작
- **센서**: NUC100이 5초마다 `ENV,온도,습도,암모니아,미세먼지` 송신 → 앱이 파싱 → `record_env_reading` RPC → `env_readings`/`env_latest` → 화면·콘솔 반영 (시뮬레이터 자동 양보).
- **지급**: 지급 승인(폰 QR 또는 자체지급) → 앱이 `DISPENSE` 전송 → NUC100이 코일 모터 구동 → 드롭센서로 배출 확인 → `DISP_OK` → 완료. 잼이면 `DISP_ERR,jam`.

## 재고 정확도 (권장)
현재 RPC는 지급 승인 시 차감. **`DISP_OK`(실제 배출) 이후 차감**하도록 바꾸면 잼/빈배출 시 재고가 정확해집니다. (원하면 조정)

## 소프트웨어
- 펌웨어: [nuc100_kiosk.c](nuc100_kiosk.c) — NuMicro BSP 기준 골격. 센서 드라이버(SHT31/MQ-137/먼지)의 TODO만 채우면 됨.
- 앱: [lib/hardware.js](../../lib/hardware.js) — USB 시리얼 수신/명령. (개발 빌드 필요 — Expo Go 불가)

## 앱 연동 지점 (2곳)
1. **부팅 시**: `hardware.connect(onEnv)` — 수신 라인 파싱해 `recordEnvReading(t,h,a,p)` 호출.
2. **지급 시**: SanitaryScreen의 지급 확정(‘dispensing’) 시점에 `hardware.dispense()` 호출 → `DISP_OK` 대기 후 완료.

## 빌드 주의
- USB 시리얼은 네이티브라 **개발 빌드 필요**: `npx expo install expo-dev-client react-native-usb-serialport-for-android` → `npx expo prebuild -p android` → EAS/Android Studio 빌드.
- Expo Go에서는 `lib/hardware.js`가 자동으로 no‑op(무동작)이라 앱은 정상 실행됩니다.
