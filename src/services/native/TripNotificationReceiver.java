package app.ridingo.driver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;

/**
 * Android Custom Layout Action Receiver
 * Handles direct notification action button clicks in the background:
 * - Green Accept Button (ACTION_ACCEPT_TRIP)
 * - Red Decline Button (ACTION_DECLINE_TRIP)
 */
public class TripNotificationReceiver extends BroadcastReceiver {
    private static final String TAG = "TripNotificationReceiver";

    public static final String ACTION_ACCEPT_TRIP = "ACTION_ACCEPT_TRIP";
    public static final String ACTION_DECLINE_TRIP = "ACTION_DECLINE_TRIP";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        String tripId = intent.getStringExtra("tripId");
        int notificationId = intent.getIntExtra("notificationId", 0);

        Log.i(TAG, "Notification Action Triggered: " + action + " for Trip: " + tripId);

        if (notificationId != 0) {
            NotificationManagerCompat.from(context).cancel(notificationId);
        }

        if (ACTION_ACCEPT_TRIP.equals(action)) {
            Log.i(TAG, "Processing Driver Accept in Background for Trip: " + tripId);
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                launchIntent.putExtra("autoAcceptTripId", tripId);
                launchIntent.putExtra("action", "ACCEPT");
                context.startActivity(launchIntent);
            }
        } else if (ACTION_DECLINE_TRIP.equals(action)) {
            Log.i(TAG, "Processing Driver Decline in Background for Trip: " + tripId);
            context.getSharedPreferences("ridingo_prefs", Context.MODE_PRIVATE)
                   .edit()
                   .putBoolean("declined_" + tripId, true)
                   .apply();
        }
    }
}
