/* Blog: shopping guides, style tips and deal advice.
   blog.html          → featured story + filterable grid
   blog.html?p=<slug> → the full article, with a "shop this guide" link and related stories */
(function () {
  "use strict";

  // Body blocks: ["p", text] · ["h", heading] · ["ul", [items]] · ["tip", text]
  var POSTS = [
    {
      slug: "gift-guide-under-50", tag: "Gifts", img: "gift-guide.jpg", date: "Nov 26, 2026", read: 6,
      title: "The gift guide: 20 gifts they'll love, all under $50",
      excerpt: "From cosy fashion to clever gadgets and beauty treats: easy, affordable gift ideas for everyone on your list.",
      cta: { label: "Shop gifts under $50", href: "deals.html" },
      body: [
        ["p", "The best gifts don't have to be the most expensive. They're the ones that feel picked with care. Here are our favourite ideas from across ManoMano, all for $50 or less."],
        ["h", "For the tech lover"],
        ["ul", ["Wireless earbuds for the gym and the commute", "A fast-charging power bank (look for 20,000 mAh or more)", "A smartwatch strap in a new colour to refresh their look", "A Bluetooth speaker that's small enough for a backpack"]],
        ["h", "For the style lover"],
        ["ul", ["A soft knit scarf or beanie: one size fits everyone", "A classic leather wallet or card holder", "Minimal gold or silver jewelry, such as studs, a fine chain or a simple ring", "A quality canvas tote they'll use every day"]],
        ["h", "For the self-care fan"],
        ["ul", ["A skincare set with cleanser, serum and moisturiser", "A makeup brush kit", "A scented candle and bath set for a slow evening in"]],
        ["h", "For the little ones"],
        ["ul", ["Building blocks and puzzles that grow with them", "Picture books with bright, chunky pages", "Ride-on and outdoor toys to burn off energy"]],
        ["tip", "Gift tip: add the gift to your basket early. Popular items sell out fast in the festive season, and flash-sale prices change daily."]
      ]
    },
    {
      slug: "flash-sale-survival-guide", tag: "Shopping tips", img: "flash-sale-tips.jpg", date: "Nov 24, 2026", read: 5,
      title: "Black Friday & flash sales: 7 tips to grab the best deals",
      excerpt: "Plan ahead, compare smart and check out fast. How to make every sale count without overspending.",
      cta: { label: "See today's flash sale", href: "deals.html" },
      body: [
        ["p", "Big sales move fast. The best prices on the most popular products often last only a few hours. A little planning makes the difference between a great deal and a missed one."],
        ["h", "1. Make a wishlist before the sale"],
        ["p", "Write down what you actually need and a price you're happy to pay. It keeps you focused when hundreds of offers go live at once."],
        ["h", "2. Check the 'Lowest 30d' price"],
        ["p", "On ManoMano, discounted products show the lowest price from the last 30 days. If today's price beats it, it's a genuine deal."],
        ["h", "3. Sign in and save your address"],
        ["p", "Checkout is quickest when your details are already saved. That matters when stock is limited."],
        ["h", "4. Compare options and sizes"],
        ["p", "Many products come in several colours, sizes or storage options, and the discount isn't always the same on each one. Check them all."],
        ["h", "5. Read the reviews"],
        ["p", "Star ratings and review counts tell you how a product holds up in real life. A slightly higher price for a far better-rated product is often worth it."],
        ["h", "6. Watch for free shipping"],
        ["p", "Look for the 'Free shipping' label. Combining items in one order can save more than an extra few percent off."],
        ["h", "7. Set a budget and stick to it"],
        ["p", "Sales are designed to create urgency. A deal on something you don't need is not a saving."],
        ["tip", "Bookmark the Flash Sale page. New deals are added every day."]
      ]
    },
    {
      slug: "smartphone-buying-guide-2026", tag: "Mobiles", img: "smartphone-guide.jpg", date: "Nov 22, 2026", read: 7,
      title: "Smartphone buying guide 2026: which phone is right for you?",
      excerpt: "Camera, battery, storage, screen: what really matters, and how much you need to spend for it.",
      cta: { label: "Shop mobiles", href: "category.html?q=phone" },
      body: [
        ["p", "Phones have never been better, or more confusing to choose between. Start with how you use your phone every day, then match the specs to that."],
        ["h", "Set your budget first"],
        ["ul", ["Under $300: great for calls, messaging, social media and streaming", "$300–$700: the sweet spot, with excellent cameras, smooth screens and all-day battery", "$700+: flagship cameras, the fastest chips, premium materials and the longest software support"]],
        ["h", "Storage: buy more than you think"],
        ["p", "Photos, videos and apps add up quickly. 128 GB is the sensible minimum today. Choose 256 GB if you shoot a lot of video or keep phones for 3+ years."],
        ["h", "Battery and charging"],
        ["p", "Look for 4,500 mAh or more for comfortable all-day use, and fast charging (30W+) so a quick top-up gets you through the evening."],
        ["h", "Camera: look past the megapixels"],
        ["p", "A bigger sensor, optical image stabilisation and a good ultra-wide or zoom lens matter far more than a big megapixel number."],
        ["h", "Screen"],
        ["p", "A 90Hz or 120Hz display makes scrolling feel smooth. OLED screens give deeper blacks and are easier to read outdoors."],
        ["tip", "Don't forget accessories: a case, a screen protector and a fast charger protect your new phone from day one."]
      ]
    },
    {
      slug: "winter-wardrobe-essentials", tag: "Fashion", img: "winter-wardrobe.jpg", date: "Nov 20, 2026", read: 5,
      title: "Winter wardrobe essentials every woman needs",
      excerpt: "Ten timeless pieces that mix, match and keep you warm, from the perfect coat to the boots you'll live in.",
      cta: { label: "Shop women's fashion", href: "category.html?q=women" },
      body: [
        ["p", "A great winter wardrobe isn't about owning more. It's about owning the right pieces. Build around these essentials and you'll always have something to wear."],
        ["h", "The core pieces"],
        ["ul", ["A tailored wool coat in camel, black or burgundy", "A chunky knit jumper and a fine-knit roll neck", "Dark straight-leg jeans", "A midi dress you can layer with tights and boots", "Ankle boots with a comfortable block heel", "A warm scarf in a colour that lifts your face"]],
        ["h", "How to layer without the bulk"],
        ["p", "Start with a thin base layer, add a knit, then your coat. Fine merino and thermal fabrics keep you warm without adding volume."],
        ["h", "Finish with accessories"],
        ["p", "Leather gloves, a structured bag and simple gold jewelry instantly make a cosy outfit look polished."],
        ["tip", "Style tip: stick to two or three base colours. Everything you own will go together."]
      ]
    },
    {
      slug: "mens-smart-casual-style", tag: "Fashion", img: "mens-style.jpg", date: "Nov 18, 2026", read: 5,
      title: "Men's smart-casual style: 8 pieces that never fail",
      excerpt: "Look sharp at work, dinner or a weekend away with a small, versatile wardrobe that's easy to put together.",
      cta: { label: "Shop men's fashion", href: "category.html?q=men" },
      body: [
        ["p", "Smart-casual is the dress code that covers almost everything. Get these eight pieces right and getting dressed takes two minutes."],
        ["h", "The eight essentials"],
        ["ul", ["A navy blazer that fits well across the shoulders", "Crisp white and light-blue shirts", "Slim chinos in beige and navy", "Dark, clean denim with no rips", "A fine-knit crew-neck jumper", "Plain white leather trainers", "Brown leather shoes or loafers", "A quality leather belt that matches your shoes"]],
        ["h", "Fit is everything"],
        ["p", "A $40 shirt that fits beats a $200 one that doesn't. Sleeves should end at your wrist bone, and trousers should sit just on top of your shoes."],
        ["h", "Add personality with details"],
        ["p", "A good watch, a textured jumper or a patterned pocket square adds character without breaking the smart look."],
        ["tip", "Style tip: when in doubt, a navy blazer over a white T-shirt with dark jeans works almost anywhere."]
      ]
    },
    {
      slug: "glow-skincare-makeup-routine", tag: "Beauty", img: "glow-routine.jpg", date: "Nov 15, 2026", read: 6,
      title: "A simple 5-step skincare & makeup routine for glowing skin",
      excerpt: "Fewer products, better results. A daily routine that keeps skin healthy and makeup looking fresh all day.",
      cta: { label: "Shop beauty", href: "category.html?q=beauty" },
      body: [
        ["p", "Glowing skin starts with a consistent routine, not a crowded shelf. These five steps take less than ten minutes every morning."],
        ["h", "1. Cleanse gently"],
        ["p", "Use a mild, non-stripping cleanser. Skin that feels tight afterwards has been over-cleansed."],
        ["h", "2. Treat with a serum"],
        ["p", "Vitamin C in the morning brightens and protects. Hyaluronic acid adds instant hydration."],
        ["h", "3. Moisturise"],
        ["p", "Even oily skin needs moisture. Choose a light gel for oily skin or a richer cream if your skin is dry."],
        ["h", "4. Never skip SPF"],
        ["p", "Sunscreen is the most effective anti-ageing product there is. Use SPF 30 or higher every day, even when it's cloudy."],
        ["h", "5. Keep makeup light"],
        ["p", "A tinted moisturiser or light foundation, concealer only where you need it, a touch of cream blush and mascara give a fresh, natural finish."],
        ["tip", "Beauty tip: clean your makeup brushes every week. It's better for your skin and helps makeup blend more smoothly."]
      ]
    },
    {
      slug: "how-to-choose-jewelry", tag: "Jewelry", img: "jewelry-guide.jpg", date: "Nov 12, 2026", read: 4,
      title: "How to choose jewelry that suits you, and keep it shining",
      excerpt: "Gold or silver? Studs or hoops? Find pieces that flatter you, plus easy care tips to make them last.",
      cta: { label: "Shop jewelry", href: "category.html?q=jewelry" },
      body: [
        ["p", "The right jewelry finishes an outfit and can become something you wear for years. Here's how to choose well."],
        ["h", "Gold, silver or rose gold?"],
        ["p", "Look at the veins on your wrist. Greenish veins usually suit gold, bluish veins suit silver, and if you can't tell, both will look great on you."],
        ["h", "Match earrings to your face shape"],
        ["ul", ["Round face: long drops or angular shapes", "Long face: studs, small hoops or wide earrings", "Heart-shaped face: teardrops that are wider at the bottom", "Square face: hoops and curved designs to soften the angles"]],
        ["h", "Start a capsule collection"],
        ["p", "A pair of studs, small hoops, a fine chain necklace and one statement piece will cover every occasion."],
        ["h", "Keep it shining"],
        ["ul", ["Put jewelry on last, after perfume and lotion", "Take it off before swimming, showering or exercising", "Store pieces separately to avoid scratches and tangles", "Polish with a soft cloth after wearing"]],
        ["tip", "Gift tip: pearls and simple gold pieces are timeless. They're a safe and beautiful choice for any age."]
      ]
    },
    {
      slug: "laptop-buying-guide", tag: "Electronics", img: "laptop-guide.jpg", date: "Nov 9, 2026", read: 7,
      title: "Laptop buying guide: for work, study or gaming",
      excerpt: "Processor, RAM, storage and screen explained simply, so you get the right laptop for the way you work.",
      cta: { label: "Shop computers & accessories", href: "category.html?q=laptop" },
      body: [
        ["p", "The right laptop depends on what you'll use it for. Pick your type below, then check the specs that matter for it."],
        ["h", "For study and everyday use"],
        ["ul", ["A recent Intel Core i5 / AMD Ryzen 5 or equivalent", "8–16 GB RAM", "256–512 GB SSD", "A light design with 8+ hours of battery"]],
        ["h", "For work and creative projects"],
        ["ul", ["Core i7 / Ryzen 7 for heavy multitasking", "16 GB RAM or more", "512 GB–1 TB SSD", "A bright, colour-accurate screen (100% sRGB)"]],
        ["h", "For gaming"],
        ["ul", ["A dedicated graphics card (RTX-class GPU)", "16–32 GB RAM", "A high refresh-rate screen (144Hz+)", "Good cooling, because performance drops when a laptop overheats"]],
        ["h", "Don't overlook"],
        ["p", "The keyboard, the ports (USB-C, HDMI) and the weight. You'll notice them every day, long after the spec sheet is forgotten."],
        ["tip", "Upgrade tip: an SSD makes the biggest everyday speed difference. Never buy a laptop with only a hard drive."]
      ]
    },
    {
      slug: "headphones-vs-earbuds", tag: "Electronics", img: "headphones-guide.jpg", date: "Nov 6, 2026", read: 5,
      title: "Headphones vs earbuds: which should you buy?",
      excerpt: "Sound, comfort, noise cancelling and battery life compared, so you can pick the perfect pair.",
      cta: { label: "Shop headphones & earbuds", href: "category.html?q=headphones" },
      body: [
        ["p", "Both can sound fantastic. The right choice comes down to where and how you listen."],
        ["h", "Choose over-ear headphones if…"],
        ["ul", ["You want the richest, most immersive sound", "You work from home or travel and want strong noise cancelling", "You listen for hours: bigger batteries often last 30+ hours"]],
        ["h", "Choose earbuds if…"],
        ["ul", ["You want something tiny that fits in your pocket", "You listen at the gym or while running (look for water resistance)", "You take a lot of calls on the move"]],
        ["h", "Features worth paying for"],
        ["ul", ["Active noise cancelling (ANC)", "Transparency mode, so you can hear traffic and announcements", "Multipoint pairing to switch between phone and laptop", "Fast charging: 10 minutes for hours of playback"]],
        ["tip", "Comfort tip: earbuds come with several ear-tip sizes. Trying them all improves the fit, the bass and the noise isolation."]
      ]
    },
    {
      slug: "best-toys-by-age", tag: "Baby & Kids", img: "toys-by-age.jpg", date: "Nov 3, 2026", read: 6,
      title: "The best toys by age: a parent's guide",
      excerpt: "Fun toys that also help children learn and grow, from a baby's first months to the school years.",
      cta: { label: "Shop baby & kids", href: "category.html?q=kids" },
      body: [
        ["p", "Children learn through play. The right toy at the right age builds skills and keeps them happily busy."],
        ["h", "0–12 months"],
        ["ul", ["Soft toys and rattles with different textures", "High-contrast picture books", "Activity mats and stacking cups"]],
        ["h", "1–3 years"],
        ["ul", ["Large building blocks and shape sorters", "Push-along and ride-on toys", "Simple puzzles with chunky pieces"]],
        ["h", "3–5 years"],
        ["ul", ["Pretend play: kitchens, tools and dress-up", "Art supplies like crayons, paint and play dough", "Balance bikes and scooters"]],
        ["h", "6 years and up"],
        ["ul", ["Construction sets and STEM kits", "Board games that teach turn-taking and strategy", "Kick scooters, bikes and outdoor sports gear"]],
        ["tip", "Safety tip: always check the age label. Small parts are a choking risk for children under 3."]
      ]
    }
  ];

  var TAGS = ["All"].concat(POSTS.map(function (p) { return p.tag; }).filter(function (t, i, a) { return a.indexOf(t) === i; }));

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function url(p) { return "blog.html?p=" + encodeURIComponent(p.slug); }
  function img(p) { return "images/blog/" + p.img; }
  var ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function meta(p) { return '<div class="post-meta"><span>' + esc(p.date) + '</span><span aria-hidden="true">·</span><span>' + p.read + ' min read</span></div>'; }

  function card(p) {
    return '<article class="post" data-tag="' + esc(p.tag) + '">' +
      '<a class="post-cover" href="' + url(p) + '" tabindex="-1" aria-hidden="true"><img src="' + img(p) + '" alt="" width="900" height="560" loading="lazy"><span class="post-tag">' + esc(p.tag) + '</span></a>' +
      '<div class="post-body"><h3><a href="' + url(p) + '">' + esc(p.title) + '</a></h3><p>' + esc(p.excerpt) + '</p>' +
      '<div class="post-foot">' + meta(p) + '<a class="post-more" href="' + url(p) + '" aria-label="Read: ' + esc(p.title) + '">Read ' + ARROW + '</a></div></div></article>';
  }

  function renderList() {
    var main = document.getElementById("blogMain"), f = POSTS[0];
    document.title = "Blog: shopping guides & style tips | ManoMano";
    main.innerHTML =
      '<div class="crumbs"><a href="index.html">Home</a> › <span>Blog</span></div>' +
      '<header class="blog-hero"><h1>The ManoMano Blog</h1><p>Buying guides, style tips and the best ways to save, from our team to you.</p></header>' +
      '<article class="post-feature">' +
        '<a class="pf-cover" href="' + url(f) + '" tabindex="-1" aria-hidden="true"><img src="' + img(f) + '" alt="" width="900" height="560" fetchpriority="high"></a>' +
        '<div class="pf-body"><span class="pf-label">Featured · ' + esc(f.tag) + '</span><h2><a href="' + url(f) + '">' + esc(f.title) + '</a></h2><p>' + esc(f.excerpt) + '</p>' + meta(f) +
        '<a class="btn pf-btn" href="' + url(f) + '">Read the guide ' + ARROW + '</a></div>' +
      '</article>' +
      '<div class="pop-chips blog-chips" role="group" aria-label="Filter by topic">' + TAGS.map(function (t, i) { return '<button type="button" class="chip' + (i ? "" : " on") + '" data-tag="' + esc(t) + '" aria-pressed="' + (i ? "false" : "true") + '">' + esc(t) + '</button>'; }).join("") + '</div>' +
      '<div class="blog-grid" id="blogGrid">' + POSTS.slice(1).map(card).join("") + '</div>';

    main.querySelector(".blog-chips").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      var tag = b.getAttribute("data-tag");
      [].forEach.call(this.querySelectorAll(".chip"), function (c) { var on = c === b; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on ? "true" : "false"); });
      // "All" shows everything except the featured story; a topic shows every story with that tag, featured included
      var list = tag === "All" ? POSTS.slice(1) : POSTS.filter(function (p) { return p.tag === tag; });
      document.getElementById("blogGrid").innerHTML = list.map(card).join("");
    });
  }

  function block(b) {
    if (b[0] === "h") return "<h2>" + esc(b[1]) + "</h2>";
    if (b[0] === "ul") return "<ul>" + b[1].map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
    if (b[0] === "tip") return '<aside class="art-tip">' + esc(b[1]) + "</aside>";
    return "<p>" + esc(b[1]) + "</p>";
  }

  function renderPost(p) {
    var main = document.getElementById("blogMain");
    document.title = p.title + " | ManoMano Blog";
    var related = POSTS.filter(function (x) { return x !== p && x.tag === p.tag; })
      .concat(POSTS.filter(function (x) { return x !== p && x.tag !== p.tag; })).slice(0, 3);
    main.innerHTML =
      '<div class="crumbs"><a href="index.html">Home</a> › <a href="blog.html">Blog</a> › <span class="crumb-cur">' + esc(p.title) + '</span></div>' +
      '<article class="article">' +
        '<header class="art-head"><a class="post-tag art-tag" href="blog.html">' + esc(p.tag) + '</a><h1>' + esc(p.title) + '</h1><p class="art-lede">' + esc(p.excerpt) + '</p>' + meta(p) + '</header>' +
        '<img class="art-cover" src="' + img(p) + '" alt="" width="900" height="560" fetchpriority="high">' +
        '<div class="art-body">' + p.body.map(block).join("") + '</div>' +
        '<div class="art-cta"><div><strong>Ready to shop?</strong><span>Find everything from this guide on ManoMano.</span></div><a class="btn" href="' + p.cta.href + '">' + esc(p.cta.label) + ' ' + ARROW + '</a></div>' +
      '</article>' +
      '<section class="block"><div class="block-head"><h2>More stories</h2><a href="blog.html">All articles ›</a></div><div class="blog-grid">' + related.map(card).join("") + '</div></section>';
    window.scrollTo(0, 0);
  }

  var slug = new URLSearchParams(location.search).get("p");
  var post = slug && POSTS.filter(function (p) { return p.slug === slug; })[0];
  if (post) renderPost(post); else renderList();
})();
