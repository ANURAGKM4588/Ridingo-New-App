package com.ridingo.user;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.util.Base64;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * UpiAppDetectorModule
 * 
 * Native Android Module extending ReactContextBaseJavaModule.
 * Queries device PackageManager for all activities supporting the upi://pay intent,
 * extracting the app name, package name, and base64 app icon.
 */
public class UpiAppDetectorModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public UpiAppDetectorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "UpiAppDetector";
    }

    @ReactMethod
    public void getInstalledUpiApps(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            Uri uri = Uri.parse("upi://pay");
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);

            List<ResolveInfo> activities = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            WritableArray appList = Arguments.createArray();

            for (ResolveInfo info : activities) {
                if (info.activityInfo == null) continue;

                String packageName = info.activityInfo.packageName;
                String appName = info.loadLabel(pm).toString();
                Drawable iconDrawable = info.loadIcon(pm);

                String base64Icon = "";
                if (iconDrawable != null) {
                    try {
                        Bitmap bitmap = drawableToBitmap(iconDrawable);
                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                        byte[] byteArray = outputStream.toByteArray();
                        base64Icon = "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP);
                    } catch (Exception e) {
                        base64Icon = "";
                    }
                }

                WritableMap appMap = Arguments.createMap();
                appMap.putString("packageName", packageName);
                appMap.putString("appName", appName);
                appMap.putString("icon", base64Icon);
                appList.pushMap(appMap);
            }

            promise.resolve(appList);
        } catch (Exception e) {
            promise.reject("UPI_DETECT_ERROR", e.getMessage(), e);
        }
    }

    private Bitmap drawableToBitmap(Drawable drawable) {
        if (drawable instanceof BitmapDrawable) {
            BitmapDrawable bitmapDrawable = (BitmapDrawable) drawable;
            if (bitmapDrawable.getBitmap() != null) {
                return bitmapDrawable.getBitmap();
            }
        }

        int width = drawable.getIntrinsicWidth() > 0 ? drawable.getIntrinsicWidth() : 96;
        int height = drawable.getIntrinsicHeight() > 0 ? drawable.getIntrinsicHeight() : 96;

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);
        return bitmap;
    }
}
