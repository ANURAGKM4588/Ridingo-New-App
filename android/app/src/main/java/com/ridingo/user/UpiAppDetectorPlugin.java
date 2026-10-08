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

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.List;

@CapacitorPlugin(name = "UpiAppDetector")
public class UpiAppDetectorPlugin extends Plugin {

    @PluginMethod
    public void getInstalledUpiApps(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Uri uri = Uri.parse("upi://pay");
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);

            List<ResolveInfo> activities = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            JSArray appList = new JSArray();

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

                JSObject appObj = new JSObject();
                appObj.put("packageName", packageName);
                appObj.put("appName", appName);
                appObj.put("icon", base64Icon);
                appList.put(appObj);
            }

            JSObject ret = new JSObject();
            ret.put("apps", appList);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to query installed UPI apps: " + e.getMessage());
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
