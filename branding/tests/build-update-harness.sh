#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/../.." && pwd)"
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
java_dir="$(/usr/libexec/java_home -v 21)"
tools_dir="$sdk/build-tools/35.0.0"
scratch="$(mktemp -d /tmp/meeting-update-harness.XXXXXX)"
mkdir "$scratch/classes" "$scratch/dex"
cp "$project_dir/branding/tests/UpdateHarnessManifest.xml" "$scratch/AndroidManifest.xml"
"$java_dir/bin/javac" -source 8 -target 8 -cp "$sdk/platforms/android-35/android.jar" -d "$scratch/classes" \
    "$project_dir/branding/tests/UpdateFlowInstrumentation.java"
"$java_dir/bin/jar" cf "$scratch/classes.jar" -C "$scratch/classes" .
JAVA_HOME="$java_dir" "$tools_dir/d8" --lib "$sdk/platforms/android-35/android.jar" --min-api 26 \
    --output "$scratch/dex" "$scratch/classes.jar"
"$tools_dir/aapt" package -f -M "$scratch/AndroidManifest.xml" \
    -I "$sdk/platforms/android-35/android.jar" -F "$scratch/unsigned.apk"
(cd "$scratch/dex" && "$tools_dir/aapt" add "$scratch/unsigned.apk" classes.dex)
"$tools_dir/zipalign" 4 "$scratch/unsigned.apk" "$scratch/aligned.apk"
export MEETING_SIGNING_PASSWORD="$(security find-generic-password -s com.guangyuxinneng.meeting.android-signing -a wenlei -w)"
JAVA_HOME="$java_dir" "$tools_dir/apksigner" sign --ks "$HOME/.local/share/guangyu-meeting/signing/meeting-release.p12" \
    --ks-type PKCS12 --ks-key-alias guangyu-meeting --ks-pass env:MEETING_SIGNING_PASSWORD \
    --key-pass env:MEETING_SIGNING_PASSWORD --out "$scratch/update-harness.apk" "$scratch/aligned.apk"
unset MEETING_SIGNING_PASSWORD
echo "HARNESS=$scratch/update-harness.apk"
