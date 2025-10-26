package com.aswin.oveon

import android.os.Bundle
import android.webkit.WebView
import android.util.Log
import com.getcapacitor.BridgeActivity
import com.google.android.gms.ads.MobileAds

class MainActivity : BridgeActivity() {

    private val TAG = "MainActivity"
    private lateinit var billingManager: BillingManager
    lateinit var webView: WebView // Make webView accessible to WebAppInterface

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Google Mobile Ads SDK on a background thread.
        Thread { MobileAds.initialize(this) {} }.start()

        // The Capacitor BridgeActivity automatically sets up the WebView.
        // We need to access it to add our JavaScript interface.
        // Assuming the webView is available after super.onCreate()
        // You might need to adjust this based on how Capacitor's WebView is exposed.
        // A common way to access the WebView in a BridgeActivity is through 'bridge.webView'
        // However, 'bridge' is internal, so we'll get it directly if possible or rely on a custom method.
        // For a standard Capacitor setup, the 'WebView' instance is usually the one hosted by the activity.
        // The webView object is directly available via the `bridge.webView` in Capacitor 3+.
        this.webView = bridge.webView
        this.webView.settings.javaScriptEnabled = true

        // Initialize BillingManager first
        billingManager = BillingManager(this)

        // Create the JavaScript interface, passing the initialized BillingManager
        val webAppInterface = WebAppInterface(this, this.webView, billingManager)

        // Set the webAppInterface on the BillingManager
        billingManager.webAppInterface = webAppInterface

        billingManager.initBilling()

        // Add the JavaScript interface to the WebView
        this.webView.addJavascriptInterface(webAppInterface, "Android")

        // The web app URL is loaded by Capacitor automatically.
        // No need to call webView.loadUrl("https://myapp.com") explicitly here
        // if your capacitor.config.ts is set up correctly for webDir and server.url.

        // Log for confirmation
        Log.d(TAG, "MainActivity initialized with Google Play Billing and JavaScript interface.")
    }

    // Existing onDestroy and NativeAd logic from MainActivity.java can be added here if needed.
    // Since the original was commented out related to native ads, I'm omitting it for now.
    // If you plan to re-enable native ad loading (non-Capacitor plugin), please let me know.
}
