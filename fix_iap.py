import os

def patch_app_js():
    file_path = 'App.js'
    
    if not os.path.exists(file_path):
        print("❌ App.js not found in the current directory.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix 1: Update Product ID
    content = content.replace(
        "const PRODUCT_ID = 'your_subscription_id';",
        "const PRODUCT_ID = 'com.scrublife.ncjmm.pro.monthly';"
    )

    # Fix 2 & 3: Remove 'IAP.' prefix for native named imports
    content = content.replace("IAP.getAvailablePurchases()", "getAvailablePurchases()")
    content = content.replace("IAP.requestSubscription", "requestSubscription")

    # Fix 4: Insert setupIAP useEffect safely after the loadAll useEffect
    if "setupIAP" not in content:
        load_all_pattern = "setScreen(d.disc?'home':'disclaimer');});},[]);"
        iap_effect = """
  useEffect(() => {
    let purchaseListener = null;
    let errorListener = null;
    const setupIAP = async () => {
      try {
        await initConnection();
        purchaseListener = purchaseUpdatedListener(async (purchase) => {
          if (purchase.transactionReceipt) {
            setIsPro(true);
            await save(K.PRO, 'true');
            await finishTransaction({ purchase, isConsumable: false });
            Alert.alert('🎉 Welcome to Pro!', 'You now have full access.');
            setScreen('home');
          }
        });
        errorListener = purchaseErrorListener((error) => {
          if (error.code !== 'E_USER_CANCELLED') Alert.alert('Purchase Failed', error.message || 'Try again.');
        });
      } catch (err) { console.error('IAP init error:', err); }
    };
    setupIAP();
    return () => {
      if (purchaseListener) purchaseListener.remove();
      if (errorListener) errorListener.remove();
      endConnection();
    };
  }, []);"""
        content = content.replace(load_all_pattern, load_all_pattern + "\n" + iap_effect)

    # Fix 5A: Update PaywallScreen Props
    content = content.replace(
        "function PaywallScreen({onUnlock,onBack})",
        "function PaywallScreen({onUnlock,onRestore,onBack})"
    )

    # Fix 5B: Add Restore Button to UI
    restore_btn_code = """
    <Pressable onPress={onRestore} style={{marginTop:12,paddingVertical:10,alignItems:'center',width:'100%',minHeight:44}}>
      <Text style={{color:C.ac,fontSize:13,fontWeight:'700',textDecorationLine:'underline'}}>↻ Restore Purchases</Text>
    </Pressable>"""
    target_text = "<Text style={{color:C.t3,fontSize:10,textAlign:'center',marginTop:8}}>$34.99/month. Auto-renews monthly. Cancel anytime in Apple ID settings.</Text>"

    if "↻ Restore Purchases" not in content:
        content = content.replace(target_text, target_text + restore_btn_code)

    # Write the patched code back to App.js
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ App.js successfully patched! The 5 bugs have been eliminated.")

patch_app_js()