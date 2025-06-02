# ReadMinder

ReadMinder는 웹 페이지를 저장하고 나중에 읽을 수 있는 브라우저 확장 프로그램으로, 카테고리 정리 및 알림 기능을 제공합니다.

## 🛠️ 프로젝트 설정

### 필수 요구사항

- Node.js (v16.0.0 이상)
- npm (Node.js에 포함됨)
- Chrome, Edge 또는 기타 Chromium 기반 브라우저

### 설치 방법

1. 저장소 복제
   ```bash
   git clone https://github.com/your-username/read-later.git
   cd read-later
   ```

2. 의존성 설치
   ```bash
   npm install
   ```

## 📂 프로젝트 구조

```
├── manifest.json          # 확장 프로그램 설정
├── popup.html             # 메인 확장 UI
├── popup.js               # 메인 UI 컨트롤러
├── background.js          # 백그라운드 작업용 서비스 워커
├── icons/                 # 확장 프로그램 아이콘
├── scripts/               # 빌드 스크립트
│   └── build.js           # 빌드 자동화
├── src/                   # 핵심 모듈
│   ├── categories.js      # 카테고리 관리
│   ├── category-ui.js     # 카테고리 UI 컴포넌트
│   ├── i18n.js            # 다국어 지원
│   ├── storage.js         # 데이터 저장 작업
│   ├── theme.js           # 테마 처리
│   ├── ui.js              # 일반 UI 작업
│   └── utils.js           # 유틸리티 함수
├── styles/                # CSS 스타일
│   └── main.css           # 메인 스타일시트
└── dist/                  # 빌드 출력 (자동 생성)
```

## 🚀 개발 명령어

```bash
# 확장 프로그램 빌드
npm run build

# 빌드 결과물 정리
npm run clean

# 변경 감지 개발 모드
npm run dev

# 배포용 ZIP 패키지 생성
npm run zip
```

## 🧪 테스트
1. 확장 프로그램 빌드: `npm run build`
2. 브라우저 확장 프로그램 페이지로 이동:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. "개발자 모드" 활성화
4. "압축해제된 확장 프로그램 로드" 클릭
5. `dist/` 폴더 선택

## 🔌 핵심 기능

- **웹 페이지 저장**: 현재 탭을 나중에 읽기 위해 저장
- **카테고리**: 저장된 페이지를 사용자 정의 카테고리로 정리
- **읽음/읽지 않음 상태**: 페이지를 읽음/읽지 않음으로 표시
- **자동 정리**: 읽은 항목의 자동 삭제 설정
- **알림 시스템**: 저장된 페이지에 대한 알림 설정
- **다크/라이트 테마**: 자동 또는 수동 테마 선택

## 🔒 확장 프로그램 권한

- `activeTab`: 현재 탭에 접근
- `storage`: 로컬 데이터 저장
- `tabs`: 탭 관리
- `notifications`: 알림 표시
- `contextMenus`: 컨텍스트 메뉴 항목 추가
- `alarms`: 알림 일정 예약

## 💻 브라우저 호환성

모든 Chromium 기반 브라우저 지원:
- Google Chrome
- Microsoft Edge
- Opera
- Brave
- 네이버 웨일
- Vivaldi
