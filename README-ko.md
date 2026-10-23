# Lightweight CSV Preview

[English](README.md) | 한국어

CSV 파일을 표로 확인할 수 있는 가벼운 Visual Studio Code 확장입니다. 원본 파일의 스크롤과 커서 위치를 따라가며, 프리뷰의 셀을 클릭하면 원본의 해당 위치로 이동합니다.

## 사용법

- CSV 파일에서 **Ctrl+K → V** (Windows·Linux) / **Cmd+K → V** (macOS): 옆 편집기 그룹에 프리뷰를 엽니다.
- 명령 팔레트(**Ctrl+Shift+P**, macOS는 **Cmd+Shift+P**)에서 **CSV: Open Preview**: 현재 그룹의 별도 탭에 프리뷰를 엽니다.
- **CSV: Open Preview to the Side** 또는 편집기 제목의 프리뷰 아이콘도 사용할 수 있습니다.
- 탐색기에서 CSV 파일을 우클릭하면 **CSV: Open Preview**를 선택할 수 있습니다.
- **CSV: Toggle Active Cell Highlight**로 셀 강조를 전환합니다.

프리뷰는 원본 파일에 연결됩니다. 원본을 스크롤하면 대응하는 CSV 레코드로 이동하고, 커서를 움직이면 해당 셀이 보이도록 이동하며 강조합니다. 여러 줄에 걸친 셀도 원본 위치로 매핑합니다. 프리뷰에서 수동으로 스크롤할 수 있으며, 다음 원본 스크롤 또는 커서 이동 시 다시 동기화됩니다. 프리뷰의 셀을 클릭하면 원본 편집기의 해당 셀 시작 위치로 커서와 포커스가 이동합니다. 원본이 보이지 않으면 프리뷰 옆에 엽니다.

## 설정

| 설정 | 기본값 | 동작 |
| --- | --- | --- |
| `csvPreview.highlightActiveCell` | `true` | 커서가 있는 셀 강조 |
| `csvPreview.followEditor` | `true` | 원본 스크롤과 커서 위치 따라가기 |
| `csvPreview.firstRowAsHeader` | `true` | 첫 번째 레코드를 고정 헤더로 사용 |

## 기여

오류 제보와 코드 기여 방법은 [CONTRIBUTING-ko.md](CONTRIBUTING-ko.md)를 참고하세요.
