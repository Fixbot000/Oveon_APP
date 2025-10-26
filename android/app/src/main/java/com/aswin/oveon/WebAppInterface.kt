package com.aswin.oveon

import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.content.Context
import android.util.Log
import android.widget.Toast

/**
 * JavaScript interface for the WebView to communicate with native Android code.
 */
class WebAppInterface(private val context: Context, private val webView: WebView, private val billingManager: BillingManager) {

    private val TAG = "WebAppInterface"

    /**
     * Allows JavaScript to initiate a purchase flow.
     * @param productId The ID of the product to purchase.
     */
    @JavascriptInterface
    fun startPurchase(productId: String) {
        Log.d(TAG, "startPurchase called from JS for product: $productId")
        Toast.makeText(context, "Initiating purchase for $productId", Toast.LENGTH_SHORT).show()

        // Ensure the purchase is initiated on the UI thread
        webView.post {
            if (context is MainActivity) {
                billingManager.purchase(context, productId)
            } else {
                Log.e(TAG, "Context is not MainActivity. Cannot initiate purchase.")
                Toast.makeText(context, "Error: Cannot initiate purchase.", Toast.LENGTH_SHORT).show()
                webView.evaluateJavascript("onPurchaseError('$productId', 'Context not MainActivity')", null)
            }
        }
    }

    /**
     * Placeholder for sending purchase success back to JavaScript.
     * This is actually called from BillingManager after acknowledgment.
     */
    fun onPurchaseSuccess(productId: String) {
        webView.evaluateJavascript("onPurchaseSuccess('$productId')", null)
    }

    /**
     * Placeholder for sending purchase cancellation back to JavaScript.
     * This is actually called from BillingManager.
     */
    fun onPurchaseCanceled(productId: String) {
        webView.evaluateJavascript("onPurchaseCanceled('$productId')", null)
    }

    /**
     * Placeholder for sending purchase error back to JavaScript.
     * This is actually called from BillingManager.
     */
    fun onPurchaseError(productId: String, errorMessage: String) {
        webView.evaluateJavascript("onPurchaseError('$productId', '$errorMessage')", null)
    }
}

