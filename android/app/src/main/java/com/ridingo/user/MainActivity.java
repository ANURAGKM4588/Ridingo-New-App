package com.ridingo.user;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpiAppDetectorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
