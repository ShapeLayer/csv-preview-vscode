# 기여 안내

[English](CONTRIBUTING.md) | 한국어

## 오류 제보와 기능 제안

[GitHub 이슈](https://github.com/shapelayer/csv-preview-vscode/issues)에 재현 방법, 기대한 동작, 실제 동작을 적어 주세요. 사용 중인 운영체제, VS Code 버전, 확장 버전도 함께 알려 주세요. CSV 예제가 필요하다면 개인 정보나 민감한 내용을 제거한 작은 파일로 첨부해 주세요.

## 개발 환경

Node.js 22 이상과 npm, VS Code 1.85 이상을 사용합니다.

```sh
npm ci
npm test
```

VS Code에서 이 프로젝트 폴더를 열고 F5를 누르면 확장을 실행할 별도의 VS Code 창(Extension Development Host)이 열립니다. CSV 파일을 열고 Ctrl+K → V(Windows·Linux), Cmd+K → V(macOS)로 변경한 동작을 확인합니다.

## 코드 구성

확장은 TypeScript와 기본 DOM API로 구현합니다. 프레임워크와 런타임 외부 의존성을 사용하지 않습니다.

- `src/csv.ts`: CSV 파싱과 원본 위치 매핑
- `src/extension.ts`: VS Code 명령, 편집기 연동, 프리뷰 메시지 처리
- `webview/preview.ts`: 표 표시, 열 너비 조절, 셀 클릭 처리
- `webview/preview.css`: 테마 색상과 프리뷰 스타일
- `test/`: 파싱, 편집기 연동, 프리뷰 동작 테스트

CSV 내용은 HTML로 해석하지 않고 `textContent`로 표시합니다. 프리뷰 변경 시에도 이 방식을 유지해 주세요.

## 변경 사항 확인

수정 후 `npm test`를 실행합니다. 자동 테스트는 CSV 파싱, 원본 위치 매핑, 셀 클릭 이동, 열 너비 계산과 초기화, 열 경계 하이라이트를 검증합니다.

화면 동작을 바꿨다면 별도의 VS Code 창에서 관련 기능을 확인해 주세요. 스크롤 연동, 셀 클릭, 너비 조절과 초기화, 여러 줄 셀, 밝은·어두운·고대비 테마가 확인 대상입니다.

Pull Request에는 해결하려는 문제, 변경 후 동작, 확인한 내용을 적어 주세요. 화면이 달라졌다면 스크린샷을 함께 첨부하면 검토에 도움이 됩니다.
