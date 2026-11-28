/* ================================ i18n ================================== */
/* Languages for the shop, seller panel and admin panel (this file is loaded on
   every page, right after config.js).

   1. Hand-written labels (English + Hindi): mark an element with
      data-i18n="key" (textContent), data-i18n-ph="key" (placeholder) or
      data-i18n-al="key" (aria-label); I18N.apply() fills them, and a
      MutationObserver fills anything added later.
   2. Everything else — every page, including the seller and admin panels and
      text drawn later — is translated automatically (see startGoogle below).
      English (US) and English (UK) show the original English text. */
window.I18N = (function () {
  var KEY = "mm_lang";
  // g = Google Translate code for the automatic translation (null = English).
  // flag = an <img> (emoji flags don't show on Windows); FLAG has just the file.
  var FLAG = { en: "us", uk: "gb", hi: "in", fr: "fr", de: "de", es: "es", it: "it", be: "be" };
  var LANGS = {
    en: { name: "English",               code: "EN", g: null, country: "United States" },
    uk: { name: "English (UK)",          code: "UK", g: null, country: "United Kingdom" },
    hi: { name: "हिन्दी",                  code: "HI", g: "hi", country: "India" },
    fr: { name: "Français",              code: "FR", g: "fr", country: "France" },
    de: { name: "Deutsch",               code: "DE", g: "de", country: "Germany" },
    es: { name: "Español",               code: "ES", g: "es", country: "Spain" },
    it: { name: "Italiano",              code: "IT", g: "it", country: "Italy" },
    be: { name: "Nederlands (België)",   code: "BE", g: "nl", country: "Belgium" }
  };
  Object.keys(LANGS).forEach(function (k) {
    LANGS[k].flag = '<img class="lang-flag-img" src="images/flags/' + FLAG[k] + '.svg" alt="" width="22" height="15" loading="lazy">';
  });
  var DICT = {
    en: {
      "nav.home": "Home", "nav.flash": "Flash Sale", "nav.blogs": "Blogs", "nav.brands": "All Brands", "nav.cats": "All categories",
      "search.ph": "What are you looking for?", "lang.label": "Language", "a11y.account": "Account", "a11y.basket": "Basket", "a11y.menu": "Menu",
      "foot.information": "Information & Contact", "foot.track": "Track orders", "foot.returns": "Return or withdrawal", "foot.help": "Need help?", "foot.contact": "Contact us", "foot.seller": "Become a seller",
      "foot.report": "Report illicit content", "foot.joinus": "Join Us", "foot.affiliate": "Affiliate Program", "foot.coupons": "Terms and conditions of use of coupons",
      "foot.more": "Find Out More", "foot.advice": "Our advice", "foot.popcats": "The most popular product categories", "foot.compare": "Our comparisons", "foot.best": "Best sellers", "foot.brands": "Our brands",
      "foot.international": "International", "foot.app": "The application", "foot.secure": "Secure payment", "foot.conversation": "Join the conversation!",
      "drawer.browse": "Browse", "drawer.catalog": "Catalog", "drawer.account": "Account", "drawer.signin": "Sign in / Register", "drawer.today": "Today's deals",
      "drawer.dash": "Seller Dashboard", "drawer.myproducts": "My Products", "drawer.wallet": "My Wallet", "drawer.logout": "Log out", "drawer.password": "Change Password", "drawer.profile": "Manage Profile",
      "bn.home": "Home", "bn.cats": "Categories", "bn.deals": "Deals", "bn.basket": "Basket", "bn.account": "Account",
      "home.today": "Today's Deals", "home.hot": "Hot", "home.seeall": "See all deals ›", "home.topsel": "Our top selection",
      "home.best": "Our best sellers", "home.seeall2": "See all", "home.shopcat": "Shop by category", "home.finds": "Today's best finds",
      "home.sponsored": "Sponsored", "home.viewmore": "View more",
      "sp.guesttitle": "Chat with our support team", "sp.guesttext": "Sign in to your seller account to chat with us — we usually reply within a few minutes.", "sp.signin": "Sign in to chat", "sp.become": "Become a seller", "home.brands": "Our biggest brands", "cta.add": "Add",
      "sd.dashboard": "Dashboard", "sd.products": "Products", "sd.storehouse": "Product Storehouse", "sd.orders": "Orders",
      "sd.package": "Package", "sd.spread": "Spread Packages", "sd.affiliate": "Affiliate System", "sd.withdraw": "Money Withdraw",
      "sd.conversations": "Conversations", "sd.support": "Support", "sd.chatsub": "Support team · usually replies within a few minutes", "sd.newchat": "New message from Support", "sd.shopsetting": "Shop Setting", "sd.refund": "Received Refund Request",
      "sd.commission": "Commission History", "sd.queries": "Product Queries", "sd.logout": "Log out", "sd.profile": "Show Profile", "sd.changepw": "Change Password", "sd.sellercenter": "Seller Center",
      "sd.credit": "Credit Score", "sd.seller": "Seller", "sd.guarantee": "Guarantee Money", "sd.welcome": "Welcome back",
      "sd.overview": "Here's what's happening with your shop today.", "sd.rating": "Rating", "sd.verified": "Shop verified",
      "sd.unverified": "Shop unverified", "sd.verifynow": "Verify Now", "sd.totalproducts": "Total Products", "sd.totalorder": "Total Orders",
      "sd.totalsales": "Total Sales", "sd.balance": "Wallet Balance", "sd.salesstat": "Sales Statistics", "sd.last7": "Last 7 days",
      "sd.catcount": "Category wise product count", "sd.orders.month": "Orders", "sd.thismonth": "This Month", "sd.neworder": "New Order",
      "sd.cancelled": "Cancelled", "sd.ondelivery": "On delivery", "sd.purchased": "Purchased Package", "sd.current": "Current Package",
      "sd.uploadlimit": "Products Upload Limit", "sd.times": "Times", "sd.expires": "Package Expires at", "sd.upgrade": "Upgrade Plan",
      "sd.noproducts": "No products yet.", "sd.soon": "is coming soon.", "sd.verifymsg": "Your shop is reviewed by our team — you'll be verified once your documents are approved.",
      "sd.editshop": "Edit Shop", "sd.shopname": "Shop name", "sd.contactname": "Contact name", "sd.phone": "Phone", "sd.email": "Email",
      "sd.shopimage": "Shop image", "sd.changephoto": "Change photo", "sd.save": "Save changes", "sd.saving": "Saving…", "sd.cancel": "Cancel",
      "sd.saved": "Profile updated.", "sd.relogin": "Your session has expired — please sign in again.", "sd.nonotif": "No new notifications.", "sd.optional": "optional",
      "sd.currentpw": "Current password", "sd.newpw": "New password", "sd.confirmpw": "Confirm new password", "sd.pwchanged": "Password changed.",
      "sd.pwmismatch": "The new passwords don't match.", "sd.pwshort": "New password must be at least 8 characters.", "sd.pwwrong": "Your current password is incorrect.",
      "sd.storehousesub": "Browse the full product catalog.", "sd.searchph": "Search by product name", "sd.allcats": "All categories",
      "sd.allstock": "All stock", "sd.instock": "In stock", "sd.outstock": "Out of stock", "sd.noresults": "No products found.", "sd.loading": "Loading…",
      "sd.products.n": "products", "sd.profit": "Profit",
      "sd.selected": "Selected", "sd.clear": "Clear", "sd.subtotal": "Subtotal", "sd.totalprofit": "Total profit", "sd.total": "Total",
      "sd.addall": "Add all to My Product", "sd.addmy": "Add to My Product", "sd.addmore": "Add products", "sd.add": "Add",
      "sd.added": "Added ✓", "sd.addedmsg": "Product has been updated successfully", "sd.myempty": "No products in your shop yet — add some from the Storehouse.",
      "sd.remove": "Remove", "sd.removed": "Removed from your products.", "sd.inmyshop": "In your shop",
      "sd.removetitle": "Remove product", "sd.removeconfirm": "Remove “{x}” from your shop? This can't be undone.",
      "sd.th.product": "Product", "sd.th.price": "Price", "sd.th.qty": "Qty", "sd.status": "Status", "sd.th.orders": "Orders", "sd.bought": "Bought", "sd.soldout": "Sold out", "sd.ofbought": "of {n} bought", "sd.delivered": "delivered", "sd.pendingq": "pending", "sd.noord": "No orders yet",
      "sd.st.pending": "pending", "sd.st.received": "received", "sd.st.processing": "processing", "sd.st.shipped": "shipped",
      "sd.active": "Active", "sd.hidden": "Hidden", "sd.totalamount": "Total amount",
      "sd.pendingbal": "Pending Balance", "sd.walletmoney": "Wallet Money", "sd.sendwithdraw": "Send Withdraw Request",
      "sd.offlinerecharge": "Offline Recharge Wallet", "sd.guaranteerecharge": "Guarantee Recharge", "sd.txhistory": "Transaction history",
      "sd.amount": "Amount", "sd.photo": "Photo", "sd.confirm": "Confirm", "sd.copy": "Copy", "sd.copied": "Address copied",
      "sd.noorders": "No orders yet. Customer orders will appear here.", "sd.customer": "Customer", "sd.loading": "Loading…",
      "sd.pendingsec": "Pending", "sd.deliveredsec": "Delivered", "sd.pendingearn": "Pending Earning Amount", "sd.deliveredearn": "Delivered Earning Amount",
      "sd.orderrecords": "Order records", "sd.th.order": "Order", "sd.th.orderkey": "Order Key", "sd.showing": "Showing {a}–{b} of {n}", "sd.order1": "order", "sd.orderN": "orders",
      "sd.st.pending": "Pending", "sd.st.received": "Received", "sd.st.processing": "Processing", "sd.st.shipped": "Shipped", "sd.st.delivered": "Delivered", "sd.st.cancelled": "Cancelled", "sd.viewshop": "View your shop", "sd.mywallet": "My Wallet", "sd.sellerdash": "Seller Dashboard", "sd.orderssub": "Orders from your customers.",
      "sd.uploadvoucher": "After payment, please upload the transaction voucher.", "sd.method": "Method", "sd.bank": "Bank", "sd.usdt": "USDT-TRC20",
      "sd.account": "Payout account details", "sd.accountph": "Bank account / USDT address", "sd.date": "Date", "sd.type": "Type",
      "sd.photoreq": "Please upload the payment screenshot (photo) before confirming.", "sd.chatwithus": "Chat with support",
      "sd.clickupload": "Click to upload", "sd.ordrag": "or drag & drop", "sd.uploadhint": "Payment screenshot · PNG or JPG", "sd.readyupload": "Ready to upload", "sd.change": "Change", "sd.removebtn": "Remove", "sd.withdrawable": "Withdrawable", "sd.nowithdrawpop": "You don't have enough money in your wallet to withdraw. Your wallet money must be above your guarantee money — recharge your wallet first.",
      "sd.purchase": "Product purchase", "sd.earning": "Order delivered", "sd.notenough": "Not enough wallet balance — recharge {x} more to add these products.",
      "sd.charged": "Products added. {x} was deducted from your wallet.",
      "sd.deposit": "Deposit", "sd.withdraw2": "Withdraw", "sd.guaranteet": "Guarantee", "sd.pending": "Pending", "sd.approved": "Approved", "sd.rejected": "Rejected",
      "sd.notx": "No transactions yet.", "sd.reqsent": "Request submitted for review.", "sd.view": "View", "sd.amountreq": "Enter a valid amount.",
      "sd.guarbystaff": "Guarantee money is managed by our team.", "sd.browse": "Browse", "sd.chooseimg": "Choose image",
      "sd.available": "Available to withdraw", "sd.nowithdraw": "Your wallet money must be above your guarantee money to withdraw.", "sd.maxwithdraw": "You can withdraw up to {x}.",
      "sd.addproduct": "Add New Product", "sd.paymentsetting": "Payment Settings", "sd.gotosetting": "Go to setting", "sd.configurenow": "Configure Now",
      "sd.cashpay": "Cash Payment", "sd.bankpay": "Bank Payment", "sd.bankname": "Bank Name", "sd.bankaccname": "Bank Account Name", "sd.bankaccno": "Bank Account Number", "sd.ifsc": "IFSC Code",
      "sd.usdtpay": "USDT Payment", "sd.usdtlink": "USDT Link", "sd.usdtaddr": "USDT Address", "sd.updateprofile": "Update Profile", "sd.savebtn": "Save", "sd.bankadded": "Bank Account added Successfully!", "sd.paymentdesc": "Set how buyers pay you — cash, bank or USDT.",
      "sd.wallet": "Wallet", "sd.more": "More",
      "sd.withdrawtitle": "Send A Withdraw Request", "sd.walletbalance": "Your wallet balance", "sd.guaranteebalance": "Your guarantee balance",
      "sd.operatype": "Opera Type", "sd.userbalance": "User Balance", "sd.withdrawtype": "Withdraw Type", "sd.message": "Message",
      "sd.messageph": "I want to withdraw my money", "sd.send": "Send", "sd.messagereq": "Please enter a message."
    },
    hi: {
      "nav.home": "होम", "nav.flash": "फ्लैश सेल", "nav.blogs": "ब्लॉग", "nav.brands": "सभी ब्रांड", "nav.cats": "सभी श्रेणियाँ",
      "search.ph": "आप क्या ढूँढ रहे हैं?", "lang.label": "भाषा", "a11y.account": "खाता", "a11y.basket": "बास्केट", "a11y.menu": "मेन्यू",
      "foot.information": "जानकारी और संपर्क", "foot.track": "ऑर्डर ट्रैक करें", "foot.returns": "रिटर्न या वापसी", "foot.help": "मदद चाहिए?", "foot.contact": "संपर्क करें", "foot.seller": "विक्रेता बनें",
      "foot.report": "अवैध सामग्री की रिपोर्ट करें", "foot.joinus": "हमसे जुड़ें", "foot.affiliate": "एफ़िलिएट प्रोग्राम", "foot.coupons": "कूपन उपयोग के नियम व शर्तें",
      "foot.more": "और जानें", "foot.advice": "हमारी सलाह", "foot.popcats": "सबसे लोकप्रिय श्रेणियाँ", "foot.compare": "हमारी तुलनाएँ", "foot.best": "बेस्ट सेलर", "foot.brands": "हमारे ब्रांड",
      "foot.international": "अंतरराष्ट्रीय", "foot.app": "एप्लिकेशन", "foot.secure": "सुरक्षित भुगतान", "foot.conversation": "बातचीत में शामिल हों!",
      "drawer.browse": "ब्राउज़ करें", "drawer.catalog": "कैटलॉग", "drawer.account": "खाता", "drawer.signin": "साइन इन / रजिस्टर", "drawer.today": "आज के ऑफ़र",
      "drawer.dash": "सेलर डैशबोर्ड", "drawer.myproducts": "मेरे प्रोडक्ट", "drawer.wallet": "मेरा वॉलेट", "drawer.logout": "लॉग आउट", "drawer.password": "पासवर्ड बदलें", "drawer.profile": "प्रोफ़ाइल प्रबंधित करें",
      "bn.home": "होम", "bn.cats": "श्रेणियाँ", "bn.deals": "ऑफ़र", "bn.basket": "बास्केट", "bn.account": "खाता",
      "home.today": "आज के ऑफ़र", "home.hot": "हॉट", "home.seeall": "सभी ऑफ़र देखें ›", "home.topsel": "हमारा शीर्ष चयन",
      "home.best": "हमारे बेस्ट सेलर", "home.seeall2": "सभी देखें", "home.shopcat": "श्रेणी अनुसार खरीदें", "home.finds": "आज की बेहतरीन खोज",
      "home.sponsored": "प्रायोजित", "home.viewmore": "और देखें",
      "sp.guesttitle": "हमारी सपोर्ट टीम से चैट करें", "sp.guesttext": "हमसे चैट करने के लिए अपने सेलर खाते में साइन इन करें — हम आमतौर पर कुछ ही मिनटों में जवाब देते हैं।", "sp.signin": "चैट के लिए साइन इन करें", "sp.become": "सेलर बनें", "home.brands": "हमारे सबसे बड़े ब्रांड", "cta.add": "जोड़ें",
      "sd.dashboard": "डैशबोर्ड", "sd.products": "प्रोडक्ट्स", "sd.storehouse": "प्रोडक्ट स्टोरहाउस", "sd.orders": "ऑर्डर",
      "sd.package": "पैकेज", "sd.spread": "स्प्रेड पैकेज", "sd.affiliate": "एफिलिएट सिस्टम", "sd.withdraw": "पैसे निकालें",
      "sd.conversations": "बातचीत", "sd.support": "सपोर्ट", "sd.chatsub": "सपोर्ट टीम · आमतौर पर कुछ ही मिनटों में जवाब देती है", "sd.newchat": "सपोर्ट से नया संदेश", "sd.shopsetting": "शॉप सेटिंग", "sd.refund": "रिफंड अनुरोध",
      "sd.commission": "कमीशन इतिहास", "sd.queries": "प्रोडक्ट प्रश्न", "sd.logout": "लॉग आउट", "sd.profile": "प्रोफ़ाइल देखें", "sd.changepw": "पासवर्ड बदलें", "sd.sellercenter": "सेलर सेंटर",
      "sd.credit": "क्रेडिट स्कोर", "sd.seller": "विक्रेता", "sd.guarantee": "गारंटी राशि", "sd.welcome": "वापसी पर स्वागत है",
      "sd.overview": "आज आपकी दुकान में क्या हो रहा है।", "sd.rating": "रेटिंग", "sd.verified": "शॉप सत्यापित",
      "sd.unverified": "शॉप असत्यापित", "sd.verifynow": "अभी सत्यापित करें", "sd.totalproducts": "कुल प्रोडक्ट", "sd.totalorder": "कुल ऑर्डर",
      "sd.totalsales": "कुल बिक्री", "sd.balance": "वॉलेट बैलेंस", "sd.salesstat": "बिक्री आँकड़े", "sd.last7": "पिछले 7 दिन",
      "sd.catcount": "श्रेणी अनुसार प्रोडक्ट गिनती", "sd.orders.month": "ऑर्डर", "sd.thismonth": "इस महीने", "sd.neworder": "नया ऑर्डर",
      "sd.cancelled": "रद्द", "sd.ondelivery": "डिलीवरी पर", "sd.purchased": "खरीदा गया पैकेज", "sd.current": "वर्तमान पैकेज",
      "sd.uploadlimit": "प्रोडक्ट अपलोड सीमा", "sd.times": "बार", "sd.expires": "पैकेज समाप्ति", "sd.upgrade": "प्लान अपग्रेड करें",
      "sd.noproducts": "अभी कोई प्रोडक्ट नहीं।", "sd.soon": "जल्द आ रहा है।", "sd.verifymsg": "आपकी दुकान की समीक्षा हमारी टीम कर रही है — दस्तावेज़ अनुमोदित होते ही आप सत्यापित हो जाएंगे।",
      "sd.editshop": "शॉप संपादित करें", "sd.shopname": "शॉप का नाम", "sd.contactname": "संपर्क नाम", "sd.phone": "फ़ोन", "sd.email": "ईमेल",
      "sd.shopimage": "शॉप इमेज", "sd.changephoto": "फ़ोटो बदलें", "sd.save": "बदलाव सहेजें", "sd.saving": "सहेजा जा रहा है…", "sd.cancel": "रद्द करें",
      "sd.saved": "प्रोफ़ाइल अपडेट हुई।", "sd.relogin": "आपका सत्र समाप्त हो गया — कृपया फिर से साइन इन करें।", "sd.nonotif": "कोई नई सूचना नहीं।", "sd.optional": "वैकल्पिक",
      "sd.currentpw": "वर्तमान पासवर्ड", "sd.newpw": "नया पासवर्ड", "sd.confirmpw": "नया पासवर्ड की पुष्टि करें", "sd.pwchanged": "पासवर्ड बदल गया।",
      "sd.pwmismatch": "नए पासवर्ड मेल नहीं खाते।", "sd.pwshort": "नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।", "sd.pwwrong": "आपका वर्तमान पासवर्ड गलत है।",
      "sd.storehousesub": "पूरा प्रोडक्ट कैटलॉग देखें।", "sd.searchph": "प्रोडक्ट नाम से खोजें", "sd.allcats": "सभी श्रेणियाँ",
      "sd.allstock": "सभी स्टॉक", "sd.instock": "स्टॉक में", "sd.outstock": "स्टॉक ख़त्म", "sd.noresults": "कोई प्रोडक्ट नहीं मिला।", "sd.loading": "लोड हो रहा है…",
      "sd.products.n": "प्रोडक्ट", "sd.profit": "मुनाफ़ा",
      "sd.selected": "चयनित", "sd.clear": "साफ़ करें", "sd.subtotal": "उप-योग", "sd.totalprofit": "कुल मुनाफ़ा", "sd.total": "कुल",
      "sd.addall": "सभी को मेरे प्रोडक्ट में जोड़ें", "sd.addmy": "मेरे प्रोडक्ट में जोड़ें", "sd.addmore": "प्रोडक्ट जोड़ें", "sd.add": "जोड़ें",
      "sd.added": "जोड़ा गया ✓", "sd.addedmsg": "प्रोडक्ट सफलतापूर्वक अपडेट हो गया", "sd.myempty": "अभी आपकी शॉप में कोई प्रोडक्ट नहीं — स्टोरहाउस से जोड़ें।",
      "sd.remove": "हटाएँ", "sd.removed": "आपके प्रोडक्ट से हटाया गया।", "sd.inmyshop": "आपकी शॉप में",
      "sd.removetitle": "प्रोडक्ट हटाएँ", "sd.removeconfirm": "“{x}” को आपकी शॉप से हटाएँ? इसे पूर्ववत नहीं किया जा सकता।",
      "sd.th.product": "प्रोडक्ट", "sd.th.price": "मूल्य", "sd.th.qty": "मात्रा", "sd.status": "स्थिति", "sd.th.orders": "ऑर्डर", "sd.bought": "खरीदे", "sd.soldout": "स्टॉक ख़त्म", "sd.ofbought": "{n} में से", "sd.delivered": "डिलीवर", "sd.pendingq": "पेंडिंग", "sd.noord": "अभी कोई ऑर्डर नहीं",
      "sd.st.pending": "पेंडिंग", "sd.st.received": "प्राप्त", "sd.st.processing": "प्रोसेसिंग", "sd.st.shipped": "शिप्ड",
      "sd.active": "सक्रिय", "sd.hidden": "छिपा", "sd.totalamount": "कुल राशि",
      "sd.pendingbal": "लंबित राशि", "sd.walletmoney": "वॉलेट राशि", "sd.sendwithdraw": "निकासी अनुरोध भेजें",
      "sd.offlinerecharge": "ऑफ़लाइन वॉलेट रिचार्ज", "sd.guaranteerecharge": "गारंटी रिचार्ज", "sd.txhistory": "लेन-देन इतिहास",
      "sd.amount": "राशि", "sd.photo": "फ़ोटो", "sd.confirm": "पुष्टि करें", "sd.copy": "कॉपी", "sd.copied": "पता कॉपी हुआ",
      "sd.noorders": "अभी कोई ऑर्डर नहीं। ग्राहक ऑर्डर यहाँ दिखेंगे।", "sd.customer": "ग्राहक", "sd.loading": "लोड हो रहा है…",
      "sd.pendingsec": "लंबित", "sd.deliveredsec": "डिलीवर", "sd.pendingearn": "लंबित कमाई राशि", "sd.deliveredearn": "डिलीवर कमाई राशि",
      "sd.orderrecords": "ऑर्डर रिकॉर्ड", "sd.th.order": "ऑर्डर", "sd.th.orderkey": "ऑर्डर की", "sd.showing": "{n} में से {a}–{b}", "sd.order1": "ऑर्डर", "sd.orderN": "ऑर्डर",
      "sd.st.pending": "लंबित", "sd.st.received": "प्राप्त", "sd.st.processing": "प्रोसेसिंग", "sd.st.shipped": "भेजा गया", "sd.st.delivered": "डिलीवर", "sd.st.cancelled": "रद्द", "sd.viewshop": "अपनी दुकान देखें", "sd.mywallet": "मेरा वॉलेट", "sd.sellerdash": "सेलर डैशबोर्ड", "sd.orderssub": "आपके ग्राहकों के ऑर्डर।",
      "sd.uploadvoucher": "भुगतान के बाद, कृपया लेन-देन रसीद अपलोड करें।", "sd.method": "माध्यम", "sd.bank": "बैंक", "sd.usdt": "USDT-TRC20",
      "sd.account": "भुगतान खाता विवरण", "sd.accountph": "बैंक खाता / USDT पता", "sd.date": "तारीख", "sd.type": "प्रकार",
      "sd.photoreq": "पुष्टि करने से पहले कृपया भुगतान का स्क्रीनशॉट (फ़ोटो) अपलोड करें।", "sd.chatwithus": "सपोर्ट से चैट करें",
      "sd.clickupload": "अपलोड करने के लिए क्लिक करें", "sd.ordrag": "या ड्रैग और ड्रॉप करें", "sd.uploadhint": "भुगतान स्क्रीनशॉट · PNG या JPG", "sd.readyupload": "अपलोड के लिए तैयार", "sd.change": "बदलें", "sd.removebtn": "हटाएँ", "sd.withdrawable": "निकासी योग्य", "sd.nowithdrawpop": "निकासी के लिए आपके वॉलेट में पर्याप्त राशि नहीं है। आपकी वॉलेट राशि गारंटी राशि से अधिक होनी चाहिए — पहले वॉलेट रिचार्ज करें।",
      "sd.purchase": "उत्पाद खरीद", "sd.earning": "ऑर्डर डिलीवर", "sd.notenough": "वॉलेट बैलेंस कम है — ये प्रोडक्ट जोड़ने के लिए {x} और रिचार्ज करें।",
      "sd.charged": "प्रोडक्ट जोड़ दिए गए। आपके वॉलेट से {x} काटे गए।",
      "sd.deposit": "जमा", "sd.withdraw2": "निकासी", "sd.guaranteet": "गारंटी", "sd.pending": "लंबित", "sd.approved": "स्वीकृत", "sd.rejected": "अस्वीकृत",
      "sd.notx": "अभी कोई लेन-देन नहीं।", "sd.reqsent": "अनुरोध समीक्षा हेतु भेजा गया।", "sd.view": "देखें", "sd.amountreq": "मान्य राशि दर्ज करें।",
      "sd.guarbystaff": "गारंटी राशि हमारी टीम द्वारा प्रबंधित की जाती है।", "sd.browse": "ब्राउज़ करें", "sd.chooseimg": "इमेज चुनें",
      "sd.available": "निकासी योग्य राशि", "sd.nowithdraw": "निकासी के लिए आपकी वॉलेट राशि गारंटी राशि से अधिक होनी चाहिए।", "sd.maxwithdraw": "आप अधिकतम {x} निकाल सकते हैं।",
      "sd.addproduct": "नया प्रोडक्ट जोड़ें", "sd.paymentsetting": "भुगतान सेटिंग", "sd.gotosetting": "सेटिंग पर जाएँ", "sd.configurenow": "अभी कॉन्फ़िगर करें",
      "sd.cashpay": "कैश भुगतान", "sd.bankpay": "बैंक भुगतान", "sd.bankname": "बैंक का नाम", "sd.bankaccname": "बैंक खाता नाम", "sd.bankaccno": "बैंक खाता संख्या", "sd.ifsc": "IFSC कोड",
      "sd.usdtpay": "USDT भुगतान", "sd.usdtlink": "USDT लिंक", "sd.usdtaddr": "USDT पता", "sd.updateprofile": "प्रोफ़ाइल अपडेट करें", "sd.savebtn": "सहेजें", "sd.bankadded": "बैंक खाता सफलतापूर्वक जोड़ा गया!", "sd.paymentdesc": "तय करें कि खरीदार आपको कैसे भुगतान करें — कैश, बैंक या USDT।",
      "sd.wallet": "वॉलेट", "sd.more": "और",
      "sd.withdrawtitle": "निकासी अनुरोध भेजें", "sd.walletbalance": "आपका वॉलेट बैलेंस", "sd.guaranteebalance": "आपका गारंटी बैलेंस",
      "sd.operatype": "ऑपरेशन प्रकार", "sd.userbalance": "यूज़र बैलेंस", "sd.withdrawtype": "निकासी प्रकार", "sd.message": "संदेश",
      "sd.messageph": "मैं अपना पैसा निकालना चाहता/चाहती हूँ", "sd.send": "भेजें", "sd.messagereq": "कृपया एक संदेश दर्ज करें।"
    }
  };

  // Hand-written menu labels for the other languages (the automatic translator
  // gets short menu words wrong, e.g. "Products" → "Libri"). Labels that have a
  // hand-written text are excluded from the automatic translation.
  var MENU = {
    fr: { "drawer.password": "Changer le mot de passe", "drawer.profile": "Gérer le profil", "nav.home": "Accueil", "nav.flash": "Vente flash", "nav.blogs": "Blog", "nav.brands": "Toutes les marques", "nav.cats": "Toutes les catégories",
      "search.ph": "Que recherchez-vous ?", "drawer.browse": "Parcourir", "drawer.catalog": "Catalogue", "drawer.account": "Compte", "drawer.signin": "Se connecter / S'inscrire",
      "drawer.today": "Offres du jour", "drawer.dash": "Espace vendeur", "drawer.myproducts": "Mes produits", "drawer.wallet": "Mon portefeuille", "drawer.logout": "Se déconnecter",
      "bn.home": "Accueil", "bn.cats": "Catégories", "bn.deals": "Offres", "bn.basket": "Panier", "bn.account": "Compte",
      "sd.dashboard": "Tableau de bord", "sd.products": "Produits", "sd.storehouse": "Entrepôt de produits", "sd.orders": "Commandes", "sd.spread": "Forfaits de promotion",
      "sd.affiliate": "Programme d'affiliation", "sd.withdraw": "Retrait d'argent", "sd.conversations": "Conversations", "sd.shopsetting": "Paramètres de la boutique",
      "sd.refund": "Demandes de remboursement", "sd.commission": "Historique des commissions", "sd.queries": "Questions sur les produits", "sd.logout": "Se déconnecter",
      "sd.seller": "Vendeur", "sd.guarantee": "Dépôt de garantie", "sd.viewshop": "Voir votre boutique", "sd.wallet": "Portefeuille", "sd.more": "Plus" },
    de: { "drawer.password": "Passwort ändern", "drawer.profile": "Profil verwalten", "nav.home": "Startseite", "nav.flash": "Blitzangebote", "nav.blogs": "Blog", "nav.brands": "Alle Marken", "nav.cats": "Alle Kategorien",
      "search.ph": "Wonach suchen Sie?", "drawer.browse": "Stöbern", "drawer.catalog": "Katalog", "drawer.account": "Konto", "drawer.signin": "Anmelden / Registrieren",
      "drawer.today": "Angebote des Tages", "drawer.dash": "Verkäufer-Dashboard", "drawer.myproducts": "Meine Produkte", "drawer.wallet": "Meine Geldbörse", "drawer.logout": "Abmelden",
      "bn.home": "Start", "bn.cats": "Kategorien", "bn.deals": "Angebote", "bn.basket": "Warenkorb", "bn.account": "Konto",
      "sd.dashboard": "Dashboard", "sd.products": "Produkte", "sd.storehouse": "Produktlager", "sd.orders": "Bestellungen", "sd.spread": "Werbepakete",
      "sd.affiliate": "Partnerprogramm", "sd.withdraw": "Auszahlung", "sd.conversations": "Unterhaltungen", "sd.shopsetting": "Shop-Einstellungen",
      "sd.refund": "Erstattungsanfragen", "sd.commission": "Provisionsverlauf", "sd.queries": "Produktanfragen", "sd.logout": "Abmelden",
      "sd.seller": "Verkäufer", "sd.guarantee": "Garantiebetrag", "sd.viewshop": "Ihren Shop ansehen", "sd.wallet": "Geldbörse", "sd.more": "Mehr" },
    es: { "drawer.password": "Cambiar contraseña", "drawer.profile": "Gestionar perfil", "nav.home": "Inicio", "nav.flash": "Venta flash", "nav.blogs": "Blog", "nav.brands": "Todas las marcas", "nav.cats": "Todas las categorías",
      "search.ph": "¿Qué estás buscando?", "drawer.browse": "Explorar", "drawer.catalog": "Catálogo", "drawer.account": "Cuenta", "drawer.signin": "Iniciar sesión / Registrarse",
      "drawer.today": "Ofertas del día", "drawer.dash": "Panel del vendedor", "drawer.myproducts": "Mis productos", "drawer.wallet": "Mi monedero", "drawer.logout": "Cerrar sesión",
      "bn.home": "Inicio", "bn.cats": "Categorías", "bn.deals": "Ofertas", "bn.basket": "Cesta", "bn.account": "Cuenta",
      "sd.dashboard": "Panel", "sd.products": "Productos", "sd.storehouse": "Almacén de productos", "sd.orders": "Pedidos", "sd.spread": "Paquetes de promoción",
      "sd.affiliate": "Programa de afiliados", "sd.withdraw": "Retirar dinero", "sd.conversations": "Conversaciones", "sd.shopsetting": "Ajustes de la tienda",
      "sd.refund": "Solicitudes de reembolso", "sd.commission": "Historial de comisiones", "sd.queries": "Consultas de productos", "sd.logout": "Cerrar sesión",
      "sd.seller": "Vendedor", "sd.guarantee": "Dinero de garantía", "sd.viewshop": "Ver tu tienda", "sd.wallet": "Monedero", "sd.more": "Más" },
    it: { "drawer.password": "Cambia password", "drawer.profile": "Gestisci profilo", "nav.home": "Home", "nav.flash": "Offerte lampo", "nav.blogs": "Blog", "nav.brands": "Tutti i marchi", "nav.cats": "Tutte le categorie",
      "search.ph": "Cosa stai cercando?", "drawer.browse": "Sfoglia", "drawer.catalog": "Catalogo", "drawer.account": "Account", "drawer.signin": "Accedi / Registrati",
      "drawer.today": "Offerte del giorno", "drawer.dash": "Pannello venditore", "drawer.myproducts": "I miei prodotti", "drawer.wallet": "Il mio portafoglio", "drawer.logout": "Esci",
      "bn.home": "Home", "bn.cats": "Categorie", "bn.deals": "Offerte", "bn.basket": "Carrello", "bn.account": "Account",
      "sd.dashboard": "Pannello di controllo", "sd.products": "Prodotti", "sd.storehouse": "Magazzino prodotti", "sd.orders": "Ordini", "sd.spread": "Pacchetti promozionali",
      "sd.affiliate": "Programma di affiliazione", "sd.withdraw": "Prelievo di denaro", "sd.conversations": "Conversazioni", "sd.shopsetting": "Impostazioni negozio",
      "sd.refund": "Richieste di rimborso", "sd.commission": "Storico commissioni", "sd.queries": "Domande sui prodotti", "sd.logout": "Esci",
      "sd.seller": "Venditore", "sd.guarantee": "Deposito di garanzia", "sd.viewshop": "Visualizza il tuo negozio", "sd.wallet": "Portafoglio", "sd.more": "Altro" },
    be: { "drawer.password": "Wachtwoord wijzigen", "drawer.profile": "Profiel beheren", "nav.home": "Home", "nav.flash": "Flitsverkoop", "nav.blogs": "Blog", "nav.brands": "Alle merken", "nav.cats": "Alle categorieën",
      "search.ph": "Waar ben je naar op zoek?", "drawer.browse": "Bladeren", "drawer.catalog": "Catalogus", "drawer.account": "Account", "drawer.signin": "Aanmelden / Registreren",
      "drawer.today": "Aanbiedingen van vandaag", "drawer.dash": "Verkopersdashboard", "drawer.myproducts": "Mijn producten", "drawer.wallet": "Mijn portemonnee", "drawer.logout": "Afmelden",
      "bn.home": "Home", "bn.cats": "Categorieën", "bn.deals": "Aanbiedingen", "bn.basket": "Winkelmandje", "bn.account": "Account",
      "sd.dashboard": "Dashboard", "sd.products": "Producten", "sd.storehouse": "Productmagazijn", "sd.orders": "Bestellingen", "sd.spread": "Promotiepakketten",
      "sd.affiliate": "Partnerprogramma", "sd.withdraw": "Geld opnemen", "sd.conversations": "Gesprekken", "sd.shopsetting": "Winkelinstellingen",
      "sd.refund": "Terugbetalingsverzoeken", "sd.commission": "Commissiegeschiedenis", "sd.queries": "Productvragen", "sd.logout": "Afmelden",
      "sd.seller": "Verkoper", "sd.guarantee": "Waarborgbedrag", "sd.viewshop": "Bekijk je winkel", "sd.wallet": "Portemonnee", "sd.more": "Meer" }
  };
  Object.keys(MENU).forEach(function (l) { DICT[l] = MENU[l]; });
  var lang = read();
  function read() { try { var l = localStorage.getItem(KEY); return LANGS[l] ? l : "en"; } catch (e) { return "en"; } }
  function t(k) { var d = DICT[lang] || {}; return d[k] != null ? d[k] : (DICT.en[k] != null ? DICT.en[k] : k); }
  function one(el) {
    var k = el.getAttribute("data-i18n");
    if (k != null) {
      el.textContent = t(k);
      // Hand-written text in this language → keep the automatic translator off it.
      if (LANGS[lang].g && (DICT[lang] || {})[k] != null) { el.classList.add("notranslate"); el.setAttribute("translate", "no"); }
    }
    var p = el.getAttribute("data-i18n-ph"); if (p != null) el.setAttribute("placeholder", t(p));
    var a = el.getAttribute("data-i18n-al"); if (a != null) el.setAttribute("aria-label", t(a));
  }
  // Never machine-translate: the brand/logo, people's and shop names, emails,
  // codes / IPs, file names, form fields.
  var KEEP = ".brand,.adm-brand,.sd-brand,.adm-me,.adm-me-head,.adm-avatar,.adm-code,code,.adm-vis-page," +
             "#sdShop,#sdShop2,#sdShop3,#sdEmail,#sdEmail2,.sd-ava,.sd-avatar,.sd-who-tx b,input,textarea,[data-keep]";
  // …and amounts such as "$29.80", "₹1,200", "€12" (else "$59.99" → "59,99 dollars").
  var MONEY = /^\s*[-+]?\s*[$₹€£]\s?[\d.,]+\s*$|^\s*[-+]?[\d.,]+\s?[$₹€£]\s*$/;
  function keep(root) {
    if (!LANGS[lang].g || !root.querySelectorAll) return;
    if (root.matches && root.matches(KEEP)) root.classList.add("notranslate");
    root.querySelectorAll(KEEP).forEach(function (el) { el.classList.add("notranslate"); });
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!el.children.length && MONEY.test(el.textContent)) el.classList.add("notranslate");
    }
    if (!root.children.length && MONEY.test(root.textContent)) root.classList.add("notranslate");
  }
  function apply(root) {
    root = root || document;
    keep(root.nodeType === 9 ? root.documentElement : root);
    if (root.nodeType === 1 && (root.hasAttribute("data-i18n") || root.hasAttribute("data-i18n-ph") || root.hasAttribute("data-i18n-al"))) one(root);
    if (root.querySelectorAll) root.querySelectorAll("[data-i18n],[data-i18n-ph],[data-i18n-al]").forEach(one);
  }
  // Changing language reloads the page: the automatic translation can't be
  // undone in place, and a reload keeps every panel consistent.
  function setLang(l) {
    if (!LANGS[l] || l === lang) return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    clearGoogleCookie();
    location.reload();
  }
  document.documentElement.setAttribute("lang", LANGS[lang].g || "en");
  // Content already on the page when this file runs (e.g. the seller panel's
  // sidebar) gets its labels / no-translate marks once the page has loaded.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(document); });
  else apply(document);
  if ("MutationObserver" in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) apply(n); }); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  /* ---- 2. Automatic translation of everything else (Google Translate) ----
     Only loaded when a non-English language is chosen. Google's own toolbar,
     tooltips and highlights are hidden — our flag menus are the only control.
     Anything marked class="notranslate" / translate="no" is left as is. */
  function clearGoogleCookie() {
    var gone = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    try { document.cookie = gone; document.cookie = gone + "; domain=" + location.hostname; document.cookie = gone + "; domain=." + location.hostname; } catch (e) {}
  }
  function startGoogle(target) {
    var css = document.createElement("style");
    css.textContent = "iframe.skiptranslate,.goog-te-banner-frame,#goog-gt-tt,.goog-te-balloon-frame,.goog-tooltip,.goog-te-spinner-pos," +
      "[class^='VIpgJd-ZVi9od'],#mmGT{display:none!important;visibility:hidden!important}" +
      "body{top:0!important;position:static!important}.goog-text-highlight{background:none!important;box-shadow:none!important}" +
      "font[style*='vertical-align']{vertical-align:baseline!important}";
    (document.head || document.documentElement).appendChild(css);
    // The cookie lets Google translate straight away on the live site; the
    // hidden <select> is driven too, for pages opened as local files.
    try { document.cookie = "googtrans=/en/" + target + "; path=/"; } catch (e) {}
    window.mmGoogleInit = function () {
      try {
        new google.translate.TranslateElement({ pageLanguage: "en", includedLanguages: "hi,fr,de,es,it,nl", autoDisplay: false }, "mmGT");
      } catch (e) { return; }
      var tries = 0, pick = function () {
        var sel = document.querySelector("#mmGT select.goog-te-combo");
        if (sel && sel.options.length > 1) {
          if (sel.value !== target) { sel.value = target; sel.dispatchEvent(new Event("change")); }
        } else if (++tries < 60) setTimeout(pick, 250);
      };
      pick();
    };
    var go = function () {
      if (!document.getElementById("mmGT")) { var d = document.createElement("div"); d.id = "mmGT"; document.body.appendChild(d); }
      var s = document.createElement("script");
      s.src = "https://translate.google.com/translate_a/element.js?cb=mmGoogleInit"; s.async = true;
      document.head.appendChild(s);
    };
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }
  if (LANGS[lang].g) startGoogle(LANGS[lang].g); else clearGoogleCookie();

  // Footer shown under the languages in every language menu: "More +".
  // Informational only — it isn't a button, and clicking it does
  // nothing (the menu stays open). Styled once here so the shop, seller panel
  // and admin panel menus all look the same.
  function moreItem() {
    if (!document.getElementById("langMoreCss")) {
      var st = document.createElement("style"); st.id = "langMoreCss";
      st.textContent = ".lang-more{display:block;margin:6px 2px 0;padding:11px 10px 8px 42px;border-top:1px solid rgba(16,35,63,.1);" +
        "font-size:14px;font-weight:600;color:#7a8499;cursor:default;user-select:none;-webkit-user-select:none}";
      (document.head || document.documentElement).appendChild(st);
      // Clicks on it are swallowed, so the menu doesn't close or pick anything.
      document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".lang-more")) { e.stopPropagation(); e.preventDefault(); } }, true);
    }
    return '<div class="lang-more" role="presentation" aria-disabled="true">More +</div>';
  }

  // Builds a flag language picker: a button (flag + code) and a menu of every
  // language. Used by the admin panel; the shop and seller panel have their own
  // markup but share LANGS / setLang.
  function picker(btn, menu, cls) {
    cls = cls || "lang-opt";
    menu.classList.add("notranslate"); menu.setAttribute("translate", "no");
    btn.classList.add("notranslate"); btn.setAttribute("translate", "no");
    menu.innerHTML = Object.keys(LANGS).map(function (k) {
      var L = LANGS[k];
      return '<button type="button" class="' + cls + (k === lang ? ' on' : '') + '" role="menuitem" data-lang="' + k + '">' +
        '<span class="lang-flag">' + L.flag + '</span><span class="lang-nm">' + L.name + '<small>' + L.country + '</small></span></button>';
    }).join("") + moreItem();
    var close = function () { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); });
    menu.addEventListener("click", function (e) { var o = e.target.closest("[data-lang]"); if (o) { close(); setLang(o.getAttribute("data-lang")); } });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  return { t: t, apply: apply, setLang: setLang, get: function () { return lang; }, langs: LANGS, picker: picker, moreItem: moreItem };
})();
