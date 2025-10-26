package com.aswin.oveon

import android.app.Activity
import android.content.Context
import android.util.Log
import android.widget.Toast
import com.android.billingclient.api.*

/**
 * Manages Google Play Billing operations.
 */
class BillingManager(private val context: Context) : PurchasesUpdatedListener {

    private val TAG = "BillingManager"
    private lateinit var billingClient: BillingClient
    private val PRODUCT_ID = "oveon_premium" // Fixed product ID
    lateinit var webAppInterface: WebAppInterface // Will be set after initialization

    /**
     * Initializes the Google Play BillingClient.
     */
    fun initBilling() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing setup successful.")
                    Toast.makeText(context, "Billing setup successful", Toast.LENGTH_SHORT).show()
                    // Query for existing purchases and product details once connected
                    queryPurchases()
                    queryProductDetails()
                } else {
                    Log.e(TAG, "Billing setup failed: ${billingResult.debugMessage}")
                    Toast.makeText(context, "Billing setup failed: ${billingResult.debugMessage}", Toast.LENGTH_LONG).show()
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected. Trying to reconnect...")
                Toast.makeText(context, "Billing service disconnected. Trying to reconnect...", Toast.LENGTH_SHORT).show()
                // Try to restart the connection on a slight delay
                // Consider implementing a retry logic here
                initBilling()
            }
        })
    }

    /**
     * Initiates a purchase flow for a given product ID.
     */
    fun purchase(activity: Activity, productId: String) {
        if (!::billingClient.isInitialized || !billingClient.isReady) {
            Log.e(TAG, "BillingClient is not ready. Please initialize and connect first.")
            Toast.makeText(activity, "Billing service not ready.", Toast.LENGTH_SHORT).show()
            return
        }

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val productDetails = productDetailsList[0]
                val offerDetails = productDetails.oneTimePurchaseOfferDetails

                if (offerDetails != null) {
                    val billingFlowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(
                            listOf(
                                BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(productDetails)
                                    .build()
                            )
                        )
                        .build()

                    billingClient.launchBillingFlow(activity, billingFlowParams)
                } else {
                    Log.e(TAG, "No one-time purchase offer details found for product: $productId")
                    Toast.makeText(activity, "Product offer details not found.", Toast.LENGTH_SHORT).show()
                }
            } else {
                Log.e(TAG, "Failed to query product details for $productId: ${billingResult.debugMessage}")
                Toast.makeText(activity, "Failed to get product details.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Called by the BillingClient when new purchases are made or existing purchases change.
     */
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handlePurchase(purchase)
            }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.i(TAG, "User canceled the purchase.")
            Toast.makeText(context, "Purchase canceled.", Toast.LENGTH_SHORT).show()
            // Send cancellation back to JavaScript
            webAppInterface.onPurchaseCanceled(PRODUCT_ID)
        } else {
            Log.e(TAG, "Error onPurchasesUpdated: ${billingResult.debugMessage}")
            Toast.makeText(context, "Purchase error: ${billingResult.debugMessage}", Toast.LENGTH_LONG).show()
            // Send error back to JavaScript
            webAppInterface.onPurchaseError(PRODUCT_ID, billingResult.debugMessage)
        }
    }

    /**
     * Handles a purchase, acknowledging it if it's an in-app purchase and not yet acknowledged.
     */
    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Verify the purchase here
            // For this example, we'll just acknowledge it
            if (!purchase.isAcknowledged) {
                acknowledgePurchase(purchase)
            } else {
                Log.d(TAG, "Purchase already acknowledged: ${purchase.orderId}")
                Toast.makeText(context, "Purchase successful and acknowledged.", Toast.LENGTH_SHORT).show()
                // Send success back to JavaScript
                webAppInterface.onPurchaseSuccess(PRODUCT_ID)
            }
        } else if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
            Log.i(TAG, "Purchase is pending: ${purchase.orderId}")
            Toast.makeText(context, "Purchase is pending.", Toast.LENGTH_SHORT).show()
        } else if (purchase.purchaseState == Purchase.PurchaseState.UNSPECIFIED_STATE) {
            Log.w(TAG, "Purchase is in an unspecified state: ${purchase.orderId}")
            Toast.makeText(context, "Purchase in unspecified state.", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Acknowledges a purchase.
     */
    fun acknowledgePurchase(purchase: Purchase) {
        val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        billingClient.acknowledgePurchase(acknowledgePurchaseParams) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged: ${purchase.orderId}")
                Toast.makeText(context, "Purchase successful and acknowledged.", Toast.LENGTH_SHORT).show()
                // Send success back to JavaScript
                webAppInterface.onPurchaseSuccess(PRODUCT_ID)
            } else {
                Log.e(TAG, "Failed to acknowledge purchase: ${billingResult.debugMessage}")
                Toast.makeText(context, "Failed to acknowledge purchase: ${billingResult.debugMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Queries for existing purchases.
     */
    private fun queryPurchases() {
        if (!::billingClient.isInitialized || !billingClient.isReady) {
            Log.e(TAG, "BillingClient is not ready for querying purchases.")
            return
        }

        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
        ) { billingResult, purchasesList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                for (purchase in purchasesList) {
                    handlePurchase(purchase)
                }
            } else {
                Log.e(TAG, "Query purchases failed: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Queries for product details.
     */
    private fun queryProductDetails() {
        if (!::billingClient.isInitialized || !billingClient.isReady) {
            Log.e(TAG, "BillingClient is not ready for querying product details.")
            return
        }

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Product details queried successfully. Found ${productDetailsList.size} products.")
                for (productDetails in productDetailsList) {
                    Log.d(TAG, "Product ID: ${productDetails.productId}, Title: ${productDetails.title}")
                }
            } else {
                Log.e(TAG, "Query product details failed: ${billingResult.debugMessage}")
            }
        }
    }
}
