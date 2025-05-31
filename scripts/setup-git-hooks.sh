#!/bin/bash

# Git hooks 설정 스크립트
echo "🔧 Git hooks 설정 중..."

# Git hooks 디렉토리 생성
mkdir -p .git/hooks

# commit-msg hook 생성
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash

# 커밋 메시지 파일 경로
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat $COMMIT_MSG_FILE)

# 이미 잘 작성된 커밋 메시지면 통과
if [[ $COMMIT_MSG =~ ^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?:\ .+ ]]; then
    exit 0
fi

# 자동 생성 메시지면 통과
if [[ $COMMIT_MSG =~ ^(Merge|Initial commit|Add|Update|Fix|Remove|Refactor) ]]; then
    exit 0
fi

# 변경된 파일 목록 확인
STAGED_FILES=$(git diff --cached --name-only)
MODIFIED_COUNT=$(echo "$STAGED_FILES" | wc -l | tr -d ' ')

if [ "$MODIFIED_COUNT" -eq 0 ]; then
    echo "❌ 변경사항이 없습니다."
    exit 1
fi

# 파일 유형별 분류
JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|ts)$' | wc -l | tr -d ' ')
CSS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(css|scss)$' | wc -l | tr -d ' ')
HTML_FILES=$(echo "$STAGED_FILES" | grep -E '\.(html)$' | wc -l | tr -d ' ')
JSON_FILES=$(echo "$STAGED_FILES" | grep -E '\.(json)$' | wc -l | tr -d ' ')
MD_FILES=$(echo "$STAGED_FILES" | grep -E '\.(md)$' | wc -l | tr -d ' ')
SCRIPT_FILES=$(echo "$STAGED_FILES" | grep -E '\.(sh)$' | wc -l | tr -d ' ')

# 커밋 유형 자동 결정
COMMIT_TYPE="chore"
COMMIT_SCOPE=""
COMMIT_DESC=""

# 새 파일인지 확인
NEW_FILES=$(git diff --cached --name-status | grep "^A" | wc -l | tr -d ' ')
DELETED_FILES=$(git diff --cached --name-status | grep "^D" | wc -l | tr -d ' ')
MODIFIED_FILES=$(git diff --cached --name-status | grep "^M" | wc -l | tr -d ' ')

# 파일 변경 유형에 따른 커밋 유형 결정
if [ "$NEW_FILES" -gt 0 ] && [ "$MODIFIED_FILES" -eq 0 ] && [ "$DELETED_FILES" -eq 0 ]; then
    COMMIT_TYPE="feat"
    COMMIT_DESC="새 기능 추가"
elif [ "$DELETED_FILES" -gt 0 ]; then
    COMMIT_TYPE="chore"
    COMMIT_DESC="파일 삭제"
elif [ "$JS_FILES" -gt 0 ]; then
    if grep -q "fix\|bug\|error" <<< "$STAGED_FILES"; then
        COMMIT_TYPE="fix"
        COMMIT_DESC="버그 수정"
    else
        COMMIT_TYPE="feat"
        COMMIT_DESC="기능 개선"
    fi
    COMMIT_SCOPE="js"
elif [ "$CSS_FILES" -gt 0 ]; then
    COMMIT_TYPE="style"
    COMMIT_DESC="스타일 업데이트"
    COMMIT_SCOPE="css"
elif [ "$HTML_FILES" -gt 0 ]; then
    COMMIT_TYPE="feat"
    COMMIT_DESC="UI 업데이트"
    COMMIT_SCOPE="html"
elif [ "$JSON_FILES" -gt 0 ]; then
    if echo "$STAGED_FILES" | grep -q "manifest.json"; then
        COMMIT_TYPE="build"
        COMMIT_DESC="매니페스트 설정 변경"
    elif echo "$STAGED_FILES" | grep -q "package.json"; then
        COMMIT_TYPE="build"
        COMMIT_DESC="의존성 설정 변경"
    else
        COMMIT_TYPE="chore"
        COMMIT_DESC="설정 파일 업데이트"
    fi
elif [ "$MD_FILES" -gt 0 ]; then
    COMMIT_TYPE="docs"
    COMMIT_DESC="문서 업데이트"
elif [ "$SCRIPT_FILES" -gt 0 ]; then
    COMMIT_TYPE="build"
    COMMIT_DESC="빌드 스크립트 업데이트"
fi

# 특정 파일명에 따른 세부 조정
if echo "$STAGED_FILES" | grep -q "popup"; then
    COMMIT_SCOPE="popup"
elif echo "$STAGED_FILES" | grep -q "background"; then
    COMMIT_SCOPE="background"
elif echo "$STAGED_FILES" | grep -q "manifest"; then
    COMMIT_SCOPE="manifest"
fi

# 커밋 메시지 생성
if [ -n "$COMMIT_SCOPE" ]; then
    NEW_COMMIT_MSG="${COMMIT_TYPE}(${COMMIT_SCOPE}): ${COMMIT_DESC}"
else
    NEW_COMMIT_MSG="${COMMIT_TYPE}: ${COMMIT_DESC}"
fi

# 변경된 주요 파일들 추가
MAIN_FILES=$(echo "$STAGED_FILES" | head -3 | sed 's/^/- /' | tr '\n' ' ')
if [ ${#MAIN_FILES} -gt 50 ]; then
    MAIN_FILES=$(echo "$STAGED_FILES" | head -2 | sed 's/^/- /' | tr '\n' ' ')
fi

# 최종 커밋 메시지 작성
echo "$NEW_COMMIT_MSG" > $COMMIT_MSG_FILE

echo "✅ 커밋 메시지 자동 생성: $NEW_COMMIT_MSG"
EOF

# prepare-commit-msg hook 생성 (코파일럿 스타일 자동 메시지)
cat > .git/hooks/prepare-commit-msg << 'EOF'
#!/bin/bash

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# merge 커밋이면 자동 생성하지 않음
if [ "$COMMIT_SOURCE" = "merge" ]; then
    exit 0
fi

# 변경된 파일 분석
STAGED_FILES=$(git diff --cached --name-only)
if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

# 지능적 커밋 메시지 생성 함수
generate_smart_commit_message() {
    local commit_type=""
    local commit_scope=""
    local commit_description=""
    local file_analysis=""
    
    # 파일별 변경사항 상세 분석
    while IFS= read -r file; do
        if [ -z "$file" ]; then continue; fi
        
        case "$file" in
            # JavaScript/TypeScript 파일
            *.js|*.ts)
                local diff_content=$(git diff --cached "$file" 2>/dev/null || echo "")
                if echo "$diff_content" | grep -q "^+.*function\|^+.*class\|^+.*const.*=.*=>"; then
                    commit_type="feat"
                    commit_description="새 기능 구현"
                elif echo "$diff_content" | grep -q "^+.*async\|^+.*await\|^+.*Promise"; then
                    commit_type="feat"
                    commit_description="비동기 처리 개선"
                elif echo "$diff_content" | grep -q "^+.*try\|^+.*catch\|^+.*error"; then
                    commit_type="fix"
                    commit_description="에러 처리 개선"
                elif echo "$diff_content" | grep -q "^-.*console\.log\|^-.*debug"; then
                    commit_type="refactor"
                    commit_description="디버그 코드 정리"
                else
                    commit_type="refactor"
                    commit_description="코드 개선"
                fi
                
                if echo "$file" | grep -q "popup"; then
                    commit_scope="popup"
                    commit_description="팝업 UI 기능 개선"
                elif echo "$file" | grep -q "background"; then
                    commit_scope="background"
                    commit_description="백그라운드 서비스 개선"
                fi
                ;;
                
            # CSS 파일
            *.css|*.scss)
                local diff_content=$(git diff --cached "$file" 2>/dev/null || echo "")
                if echo "$diff_content" | grep -q "^+.*color\|^+.*background\|^+.*theme"; then
                    commit_type="style"
                    commit_description="테마 및 색상 개선"
                elif echo "$diff_content" | grep -q "^+.*responsive\|^+.*media\|^+.*mobile"; then
                    commit_type="style"
                    commit_description="반응형 디자인 개선"
                else
                    commit_type="style"
                    commit_description="UI 스타일 개선"
                fi
                ;;
                
            # HTML 파일
            *.html)
                local diff_content=$(git diff --cached "$file" 2>/dev/null || echo "")
                if echo "$diff_content" | grep -q "^+.*<.*>"; then
                    commit_type="feat"
                    commit_description="UI 구조 개선"
                else
                    commit_type="refactor"
                    commit_description="마크업 개선"
                fi
                ;;
                
            # 설정 파일들
            manifest.json)
                commit_type="build"
                commit_scope="manifest"
                commit_description="확장 프로그램 설정 업데이트"
                ;;
            package.json)
                local diff_content=$(git diff --cached "$file" 2>/dev/null || echo "")
                if echo "$diff_content" | grep -q "dependencies\|devDependencies"; then
                    commit_type="build"
                    commit_description="의존성 패키지 업데이트"
                else
                    commit_type="build"
                    commit_description="프로젝트 설정 업데이트"
                fi
                ;;
                
            # 문서 파일들
            *.md)
                if echo "$file" | grep -q "README"; then
                    commit_type="docs"
                    commit_description="프로젝트 문서 업데이트"
                elif echo "$file" | grep -q "copilot"; then
                    commit_type="docs"
                    commit_description="개발 가이드라인 업데이트"
                else
                    commit_type="docs"
                    commit_description="문서 개선"
                fi
                ;;
                
            # 스크립트 파일들
            scripts/*.sh|*.sh)
                commit_type="build"
                commit_description="빌드 스크립트 개선"
                ;;
            scripts/*.js)
                commit_type="build"
                commit_description="빌드 시스템 개선"
                ;;
                
            # 아이콘 파일들
            icons/*)
                commit_type="style"
                commit_description="아이콘 에셋 업데이트"
                ;;
        esac
    done <<< "$STAGED_FILES"
    
    # 파일 개수에 따른 메시지 조정
    local file_count=$(echo "$STAGED_FILES" | wc -l | tr -d ' ')
    
    if [ "$file_count" -gt 3 ]; then
        if [ -n "$commit_scope" ]; then
            echo "${commit_type}(${commit_scope}): 여러 파일 동시 개선"
        else
            echo "${commit_type}: 다중 파일 업데이트"
        fi
    else
        if [ -n "$commit_scope" ]; then
            echo "${commit_type}(${commit_scope}): ${commit_description}"
        else
            echo "${commit_type}: ${commit_description}"
        fi
    fi
}

# 자동 생성된 커밋 메시지 작성
AUTO_MESSAGE=$(generate_smart_commit_message)
echo "$AUTO_MESSAGE" > "$COMMIT_MSG_FILE"
echo "" >> "$COMMIT_MSG_FILE"
echo "# 🤖 코파일럿이 자동 생성한 커밋 메시지입니다" >> "$COMMIT_MSG_FILE"
echo "# 위 메시지를 수정하거나 그대로 사용하세요" >> "$COMMIT_MSG_FILE"
echo "#" >> "$COMMIT_MSG_FILE"
echo "# 변경된 파일들:" >> "$COMMIT_MSG_FILE"
echo "$STAGED_FILES" | sed 's/^/# 📝 /' >> "$COMMIT_MSG_FILE"
echo "#" >> "$COMMIT_MSG_FILE"
echo "# 💡 커밋 유형 가이드:" >> "$COMMIT_MSG_FILE"
echo "# feat: ✨ 새 기능 추가" >> "$COMMIT_MSG_FILE"
echo "# fix: 🐛 버그 수정" >> "$COMMIT_MSG_FILE"
echo "# docs: 📚 문서 업데이트" >> "$COMMIT_MSG_FILE"
echo "# style: 💄 UI/스타일 변경" >> "$COMMIT_MSG_FILE"
echo "# refactor: ♻️ 코드 리팩토링" >> "$COMMIT_MSG_FILE"
echo "# build: 🔧 빌드/설정 변경" >> "$COMMIT_MSG_FILE"
echo "# chore: 🧹 기타 변경사항" >> "$COMMIT_MSG_FILE"
EOF

# hooks에 실행 권한 부여
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/prepare-commit-msg

echo "✅ Git hooks 설정 완료!"
echo "이제 커밋 시 자동으로 메시지가 생성됩니다."
echo ""
echo "사용법:"
echo "  git add ."
echo "  git commit  # 자동 메시지 생성"
echo "  git commit -m '직접 메시지'  # 수동 메시지"
