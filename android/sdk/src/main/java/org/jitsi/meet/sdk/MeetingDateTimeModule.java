package org.jitsi.meet.sdk;

import android.app.Activity;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import java.util.Calendar;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** Date/time selection only. Does not read or write the device calendar. */
class MeetingDateTimeModule extends ReactContextBaseJavaModule {
    MeetingDateTimeModule(ReactApplicationContext context) { super(context); }

    @Override
    public String getName() { return "MeetingDateTime"; }

    @ReactMethod
    public void pick(String mode, String value, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            Activity activity = getCurrentActivity();
            if (activity == null || activity.isFinishing()) {
                promise.reject("no_activity", "No active screen");
                return;
            }
            AtomicBoolean settled = new AtomicBoolean(false);
            java.util.function.Consumer<String> resolve = result -> {
                if (settled.compareAndSet(false, true)) promise.resolve(result);
            };
            try {
                if ("date".equals(mode)) {
                    String[] parts = value.split("-");
                    DatePickerDialog dialog = new DatePickerDialog(activity, (view, year, month, day) ->
                        resolve.accept(String.format(Locale.ROOT, "%04d-%02d-%02d", year, month + 1, day)),
                        Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]));
                    Calendar bound = Calendar.getInstance();
                    bound.clear(); bound.set(2000, 0, 1);
                    dialog.getDatePicker().setMinDate(bound.getTimeInMillis());
                    bound.set(2100, 11, 31);
                    dialog.getDatePicker().setMaxDate(bound.getTimeInMillis());
                    dialog.setOnDismissListener(ignored -> resolve.accept(null));
                    dialog.show();
                } else if ("time".equals(mode)) {
                    String[] parts = value.split(":");
                    TimePickerDialog dialog = new TimePickerDialog(activity, (view, hour, minute) ->
                        resolve.accept(String.format(Locale.ROOT, "%02d:%02d", hour, minute)),
                        Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), true);
                    dialog.setOnDismissListener(ignored -> resolve.accept(null));
                    dialog.show();
                } else {
                    promise.reject("invalid_mode", "Invalid picker mode");
                }
            } catch (RuntimeException error) {
                if (settled.compareAndSet(false, true)) promise.reject("picker_failed", error);
            }
        });
    }
}
