#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
release_dir="${1:-$project_dir/../jitsi-ecs-deploy/android-download}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${MEETING_JAVA_HOME:-$(/usr/libexec/java_home -v 21)}"
test -d "$ANDROID_HOME/build-tools/35.0.0"
test -x "$JAVA_HOME/bin/java"
cd "$project_dir"
node -e 'const s=require("fs").statfsSync("."); if(s.bavail*s.bsize<10*2**30)throw Error("Need at least 10 GiB free before Android release build");'

# One identity for Gradle, filenames and the update manifest. No time-based overrides.
version="$(node -p 'require("./branding/android-release.json").version')"
version_code="$(node -p 'require("./branding/android-release.json").versionCode')"
for abi in arm64-v8a universal; do
    if test -e "$release_dir/guangyu-meeting-$version-$version_code-$abi.apk"; then
        echo "Release already exists; refusing to reuse its version." >&2
        exit 1
    fi
done
node branding/tests/mac-window-card.cjs
node branding/tests/biometric-default.cjs
node branding/tests/login-biometric-gate.cjs
node branding/tests/prism-clock.cjs
node branding/tests/update-version.cjs
node branding/tests/update-artifacts.cjs
node branding/tests/random-room.cjs
node branding/tests/meeting-schedule.cjs
node branding/tests/device-handoff.cjs
node branding/tests/handoff-media.cjs
node branding/tests/device-transfer-notice.cjs
npm run tsc:ci
(cd android && ./gradlew :app:assembleRelease --console=plain --max-workers=2)

mkdir -p "$release_dir"
scratch="$(mktemp -d /tmp/meeting-sign.XXXXXX)"
trap 'rm -f "$scratch/arm64-v8a-aligned.apk" "$scratch/universal-aligned.apk"; rmdir "$scratch"' EXIT
export MEETING_SIGNING_PASSWORD="$(security find-generic-password -s com.guangyuxinneng.meeting.android-signing -a wenlei -w)"
for abi in arm64-v8a universal; do
    unsigned="$project_dir/android/app/build/outputs/apk/release/app-$abi-release-unsigned.apk"
    signed="$release_dir/guangyu-meeting-$version-$version_code-$abi.apk"
    if test -e "$signed"; then
        echo "Refusing to overwrite an existing release: $signed" >&2
        exit 1
    fi
    "$ANDROID_HOME/build-tools/35.0.0/zipalign" -P 16 -f 4 "$unsigned" "$scratch/$abi-aligned.apk"
    "$ANDROID_HOME/build-tools/35.0.0/apksigner" sign --ks "$HOME/.local/share/guangyu-meeting/signing/meeting-release.p12" \
        --ks-type PKCS12 --ks-key-alias guangyu-meeting --ks-pass env:MEETING_SIGNING_PASSWORD \
        --key-pass env:MEETING_SIGNING_PASSWORD --v4-signing-enabled false --out "$signed" "$scratch/$abi-aligned.apk"
done
unset MEETING_SIGNING_PASSWORD
node branding/prepare-android-release.cjs "$release_dir"
cp "$release_dir/guangyu-meeting-$version-$version_code-arm64-v8a.apk" "$release_dir/guangyu-meeting.apk"
cp "$release_dir/guangyu-meeting-$version-$version_code-universal.apk" "$release_dir/guangyu-meeting-universal.apk"
echo "Verified release prepared: $version ($version_code). Publish only after installation checks."
