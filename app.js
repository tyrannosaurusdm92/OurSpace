(() => {
  "use strict";
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const STORAGE_KEY = "jasper-squishy-care-cottage-v3";
  const CHECKOUT_EMAIL = "williamsaville92@gmail.com";
  const ET_ZONE = "America/New_York";
  const PAGES = [
    ["task-board", "Care Task Board"], ["todays-routine", "Today's Schedule"], ["chat-bot-dbt-skills", "Onyx + DBT"], ["dbt-daily-cards", "DBT Daily Cards"], ["dbt-journaling", "DBT Journaling"], ["mobile-games", "Mobile Games"], ["serotonin", "Serotonin"], ["squishy-store", "Squishy Store"]
  ];
  const REWARD_BY_PRIORITY = {
    "Critical": {copper:2400, silver:240, gold:70, platinum:8},
    "Very High": {copper:3200, silver:320, gold:100, platinum:14},
    "High": {copper:1800, silver:180, gold:45, platinum:5},
    "Medium": {copper:1100, silver:110, gold:25, platinum:2},
    "Gentle": {copper:700, silver:70, gold:12, platinum:1}
  };
  const TASKS = [
    // self-care daily
    t("take-meds","Take your meds","Self-care","Critical","daily","Taking meds is one of your highest-value body care tasks.",2400,240,70,8),
    t("eat-meal-1","Eat one meal or solid snack","Self-care","Critical","daily","Food counts even if it is simple, safe, repetitive, or tiny.",1800,180,45,5),
    t("eat-meal-2","Eat a second meal or nourishing snack","Self-care","Critical","daily","Your body deserves fuel more than once.",2200,220,60,7),
    t("hydrate","Drink water, tea, juice, or another body-safe drink","Self-care","Critical","daily","Hydration counts even when it is not perfect water.",1800,180,45,5),
    t("hygiene-reset","Shower, bath, sink wash, wipes, deodorant, or hygiene reset","Self-care","Very High","daily","Any level of hygiene care counts as body care.",3200,320,100,14),
    t("decompress","Decompress on purpose","Self-care","Critical","daily","Rest, quiet, game time, comfort show, soft lighting, or lying down all count.",2200,220,60,7),
    t("rest-before-burnout","Take a real rest break before burnout","Self-care","Critical","daily","Stopping early is not laziness; it is nervous system care.",2400,240,70,8),
    t("dbt-skill","Use one DBT skill","DBT","Very High","daily","STOP, TIPP, wise mind, check the facts, opposite action, self-soothe, DEAR MAN, GIVE, or FAST.",3000,300,90,12),
    t("daily-diary-card","Complete your DBT diary card","DBT","Very High","daily","Logging feelings and care counts as emotional labor.",3000,300,90,12),
    t("journal-entry","Write a journal entry","DBT","High","daily","A few lines counts. Messy counts. Voice-to-text counts.",1800,180,45,5),
    t("use-chatbot","Use Onyx for a check-in","DBT","High","daily","Support counts before things become a crisis.",1600,160,40,4),
    t("use-chatbot-distress","Use Onyx during distress","DBT","Very High","asneeded","Reaching for support during distress is huge.",3600,360,120,16),
    t("mini-game-decompress","Play a mini-game for decompression","Self-care","Medium","daily","Games can be healthy regulation when you use them on purpose.",1100,110,25,2),
    t("break-food","Workday food break","Self-care","Critical","weekday","Eating during care work is required care for you too.",1600,160,45,5),
    t("break-hydrate","Workday hydration break","Self-care","Critical","weekday","Hydrating during work protects your body.",1400,140,35,4),
    t("break-decompress","Workday decompression break","Self-care","Very High","weekday","You get paid in rewards for protecting your nervous system.",2200,220,70,8),
    // caregiver weekday
    t("caregiver-shift-complete","Complete your caregiver work block","Caregiver support","Very High","weekday","Monday is 7h45m; Tuesday-Friday are 5h. Breaks stay protected.",9000,900,300,45),
    t("bring-food","Bring Momma food","Caregiver support","High","asneeded","Food support is direct care and deserves a reward.",1700,170,45,5),
    t("bring-beverage","Bring Momma a beverage","Caregiver support","High","asneeded","Hydration support counts every time.",1400,140,35,4),
    t("help-hygiene","Help Momma with hygiene care","Caregiver support","Very High","asneeded","Hygiene assistance is intimate, important care.",3600,360,120,16),
    t("doctor-support","Go to or help with a doctor appointment","Caregiver support","Very High","asneeded","Medical support takes planning, stamina, and emotional labor.",5000,500,160,22),
    t("important-phone-call","Make one important phone call","Admin","High","asneeded","Phone calls count because they take executive function and stress tolerance.",2200,220,60,7),
    t("paperwork-task","Complete one paperwork task","Admin","High","asneeded","One form, one upload, one email, one document, or one call-back counts.",2500,250,70,8),
    t("apartment-application","Work on an apartment application","Admin","Very High","asneeded","Housing paperwork is a big task and earns big rewards.",5200,520,160,24),
    // bathroom
    t("bathroom-sweep","Bathroom: sweep floor","Bathroom","Medium","weekly","One room part completed.",1000,100,22,2),
    t("bathroom-mop","Bathroom: mop floor","Bathroom","High","weekly","Mopping earns more because it is body-heavy.",1800,180,45,5),
    t("bathroom-trash-out","Bathroom: take out trash","Bathroom","Medium","weekly","Trash out counts separately.",950,95,20,2),
    t("bathroom-new-bag","Bathroom: put a new bag in the trash","Bathroom","Gentle","weekly","New bag counts as its own finishing step.",600,60,12,1),
    t("bathroom-toilet","Bathroom: clean toilet","Bathroom","Very High","weekly","Toilet cleaning is high-value care.",3200,320,100,14),
    t("bathroom-shower","Bathroom: clean shower or tub","Bathroom","Very High","weekly","Shower/tub cleaning is hard physical work.",3600,360,120,16),
    t("bathroom-sink","Bathroom: wipe sink/counter/mirror","Bathroom","High","weekly","Surfaces reset the room.",1600,160,40,4),
    t("bathroom-restock","Bathroom: restock toilet paper, soap, hygiene supplies","Bathroom","Medium","weekly","Restocking prevents future stress.",950,95,20,2),
    // bedroom
    t("bedroom-sweep","Bedroom: sweep or vacuum","Bedroom","Medium","weekly","Floor care counts by room.",1000,100,22,2),
    t("bedroom-mop","Bedroom: mop hard floor","Bedroom","High","weekly","Mopping is a separate high-effort task.",1600,160,40,4),
    t("bedroom-dust","Bedroom: dust surfaces","Bedroom","Medium","weekly","Dusting helps comfort and breathing.",950,95,20,2),
    t("bedroom-organize","Bedroom: organize one surface or pile","Bedroom","Medium","every2","One pile counts. One surface counts.",900,90,18,2),
    t("bedroom-trash-out","Bedroom: take out trash","Bedroom","Medium","weekly","Trash out counts separately.",950,95,20,2),
    t("bedroom-new-bag","Bedroom: put a new bag in the trash","Bedroom","Gentle","weekly","New bag counts as its own task.",600,60,12,1),
    t("bedroom-bedding","Bedroom: bedding step","Bedroom","High","weekly","Pillowcases, sheet change, blanket reset, or laundry step.",1800,180,45,5),
    // living room
    t("living-sweep","Living room: sweep or vacuum","Living room","Medium","weekly","One room part completed.",1000,100,22,2),
    t("living-mop","Living room: mop floor","Living room","High","weekly","Mopping earns extra.",1600,160,40,4),
    t("living-dust","Living room: dust surfaces","Living room","Medium","weekly","Dusting counts separately.",950,95,20,2),
    t("living-organize","Living room: organize/reset surfaces","Living room","Medium","every2","A couch, table, shelf, blanket pile, or floor area counts.",900,90,18,2),
    t("living-trash-out","Living room: take out trash","Living room","Medium","weekly","Trash out counts separately.",950,95,20,2),
    t("living-new-bag","Living room: put a new bag in the trash","Living room","Gentle","weekly","Finishing steps deserve rewards.",600,60,12,1),
    // kitchen
    t("kitchen-dishes","Kitchen: do dishes even though it is Momma's job","Kitchen","Very High","asneeded","Taking over dishes when Momma's body cannot is a huge platinum task.",7000,700,240,40),
    t("kitchen-sweep","Kitchen: sweep floor","Kitchen","Medium","weekly","Kitchen floor sweep counts.",1100,110,25,2),
    t("kitchen-mop","Kitchen: mop floor","Kitchen","High","weekly","Kitchen mopping is high-effort.",2000,200,55,6),
    t("kitchen-trash-out","Kitchen: take out trash","Kitchen","High","every2","Kitchen trash gets its own reward.",1400,140,35,4),
    t("kitchen-new-bag","Kitchen: put a new bag in the trash","Kitchen","Gentle","every2","New bag counts separately.",700,70,14,1),
    t("kitchen-microwave","Kitchen: clean microwave","Kitchen","High","weekly","Microwave cleaning is its own task.",1800,180,45,5),
    t("kitchen-counters","Kitchen: wipe counters or stove area","Kitchen","High","every2","Surface reset lowers stress and mess.",1500,150,35,4),
    t("kitchen-inventory","Kitchen: inventory what you need","Kitchen","High","weekly","Checking food, drinks, meds, litter, paper goods, and basics counts.",1800,180,45,5),
    t("grocery-delivery-order","Place or manage a grocery delivery order","Shopping","Very High","weekly","Planning, cart-building, substitutions, and checkout are a big job.",4200,420,130,18),
    t("put-away-groceries","Put away grocery delivery","Kitchen","High","weekly","Every bag handled counts as care.",2200,220,60,7),
    // cats
    t("cat-feed","Cat care: feed the cats","Cats","Critical","daily","Cat care is family care.",1200,120,30,3),
    t("cat-water","Cat care: refresh water","Cats","Critical","daily","Fresh water counts every time.",1100,110,25,3),
    t("cat-litter-scoop","Cat care: scoop litter boxes","Cats","Very High","daily","Litter care is high-value because it is gross and important.",3000,300,95,12),
    t("cat-litter-full","Cat care: full litter change","Cats","Very High","weekly","Full litter reset earns big rewards.",5200,520,170,26),
    t("cat-brush","Cat care: brush cats","Cats","High","weekly","Grooming care counts.",1700,170,45,5),
    t("cat-nails","Cat care: trim nails","Cats","Very High","monthly","Nail trimming is a high-skill, high-patience task.",5200,520,170,26),
    t("cat-inventory","Cat care: inventory food/litter/medicine/supplies","Cats","High","weekly","Preventing cat supply emergencies counts.",1800,180,45,5)
  ];
  const STORE_AISLES = [
    "Drink Aisle", "Snack Aisle", "Candy + Dessert Aisle", "Bath + Hygiene Aisle", "Comfort + Plush Aisle", "Clothes Aisle", "Craft + Music Aisle", "Gaming Aisle", "Food Delivery + Meal Aisle", "Hotel + Big Reward Aisle", "Adult-Only Reward Aisle", "Michigan + Exclusive Aisle", "Links + Custom Finds Aisle"
  ];
  const STORE_ITEMS = [
    // Drink Aisle
    s("drink-root-beer","Root beer","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-7up","7-Up","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-regular-coke","Regular Coke","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-cherry-pepsi","Cherry Pepsi","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-orange-pop","Orange pop","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-grape-pop","Grape pop","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-mountain-dew","Mountain Dew","Drink Aisle",{copper:950,silver:95,gold:16,platinum:1}),
    s("drink-shasta-ginger-ale","Shasta ginger ale","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-gold-peak-sweet-tea","Gold Peak sweet tea","Drink Aisle",{copper:1100,silver:110,gold:22,platinum:2}),
    s("drink-watermelon-red-bull","Watermelon Red Bull","Drink Aisle",{copper:1500,silver:150,gold:35,platinum:3}),
    s("drink-grape-ghost","Grape Ghost","Drink Aisle",{copper:1500,silver:150,gold:35,platinum:3}),
    s("drink-yoohoo","Yoo-hoo milk","Drink Aisle",{copper:900,silver:90,gold:15,platinum:1}),
    s("drink-juice-box-apple","Apple juice box","Drink Aisle",{copper:1000,silver:100,gold:18,platinum:2}),
    s("drink-juice-box-fruit-punch","Fruit punch juice box","Drink Aisle",{copper:1000,silver:100,gold:18,platinum:2}),
    s("drink-caprisun-pouch","CapriSun pouch","Drink Aisle",{copper:1200,silver:120,gold:25,platinum:2}),
    s("drink-cran-grape","Bottle of cran-grape juice","Drink Aisle",{copper:1600,silver:160,gold:35,platinum:3}),
    s("drink-cran-apple","Bottle of cran-apple juice","Drink Aisle",{copper:1600,silver:160,gold:35,platinum:3}),
    s("drink-cranberry","Bottle of cranberry juice","Drink Aisle",{copper:1600,silver:160,gold:35,platinum:3}),
    s("drink-cherry-lime-ricky","Cherry lime ricky","Drink Aisle",{copper:1300,silver:130,gold:28,platinum:3}),

    // Snack Aisle
    s("snack-trail-mix","Trail mix","Snack Aisle",{copper:1400,silver:140,gold:30,platinum:3}),
    s("snack-nutella-crackers","Nutella and crackers","Snack Aisle",{copper:1300,silver:130,gold:28,platinum:3}),
    s("snack-poptarts","Pop-Tarts","Snack Aisle",{copper:1300,silver:130,gold:28,platinum:3}),
    s("snack-applesauce-cup","Apple sauce cup","Snack Aisle",{copper:1000,silver:100,gold:18,platinum:2}),
    s("snack-spam","Spam","Snack Aisle",{copper:1500,silver:150,gold:35,platinum:3}),
    s("snack-cream-cheese-frosting","Cream cheese frosting","Snack Aisle",{copper:1200,silver:120,gold:25,platinum:2}),
    s("snack-nilla-wafers","Nilla wafers","Snack Aisle",{copper:1200,silver:120,gold:25,platinum:2}),
    s("snack-salt-vinegar-chips","Salt and vinegar potato chips","Snack Aisle",{copper:1000,silver:100,gold:18,platinum:2}),
    s("snack-bbq-chips","Barbecue potato chips","Snack Aisle",{copper:1000,silver:100,gold:18,platinum:2}),
    s("snack-sour-cream-onion-chips","Sour cream and onion potato chips","Snack Aisle",{copper:1000,silver:100,gold:18,platinum:2}),

    // Candy + Dessert Aisle
    s("candy-box-chocolates","Box of chocolates","Candy + Dessert Aisle",{copper:2000,silver:200,gold:45,platinum:4}),
    s("candy-candy-bar","Candy bar","Candy + Dessert Aisle",{copper:800,silver:80,gold:12,platinum:1}),
    s("candy-bag-candy","Bag of candy","Candy + Dessert Aisle",{copper:1200,silver:120,gold:25,platinum:2}),
    s("candy-gum","Gum","Candy + Dessert Aisle",{copper:700,silver:70,gold:10,platinum:1}),
    s("candy-mints","Mints","Candy + Dessert Aisle",{copper:700,silver:70,gold:10,platinum:1}),
    s("dessert-sheet-cake","Sheet cake","Candy + Dessert Aisle",{copper:5200,silver:520,gold:160,platinum:22}),
    s("dessert-cookies","Cookies","Candy + Dessert Aisle",{copper:1600,silver:160,gold:35,platinum:3}),

    // Bath + Hygiene Aisle
    s("hygiene-sugar-scrub","Sugar scrub","Bath + Hygiene Aisle",{copper:2500,silver:250,gold:70,platinum:8}),
    s("hygiene-soap","Soap bar or body soap","Bath + Hygiene Aisle",{copper:1800,silver:180,gold:45,platinum:5}),
    s("hygiene-bath-bomb","Bath bomb","Bath + Hygiene Aisle",{copper:2200,silver:220,gold:60,platinum:7}),
    s("hygiene-lotion","Lotion","Bath + Hygiene Aisle",{copper:2200,silver:220,gold:60,platinum:7}),
    s("hygiene-body-wash","Body wash","Bath + Hygiene Aisle",{copper:2300,silver:230,gold:65,platinum:7}),
    s("hygiene-shampoo","Shampoo","Bath + Hygiene Aisle",{copper:2400,silver:240,gold:65,platinum:7}),
    s("hygiene-conditioner","Conditioner","Bath + Hygiene Aisle",{copper:2400,silver:240,gold:65,platinum:7}),
    s("cozy-candle","Candle","Bath + Hygiene Aisle",{copper:2400,silver:240,gold:60,platinum:6}),

    // Comfort + Plush Aisle
    s("comfort-rubber-duck","Rubber duck of your choice","Comfort + Plush Aisle",{copper:1800,silver:180,gold:35,platinum:3}),
    s("comfort-small-stuffed-animal","Small stuffed animal","Comfort + Plush Aisle",{copper:3000,silver:300,gold:90,platinum:10}),
    s("comfort-medium-stuffed-animal","Medium stuffed animal","Comfort + Plush Aisle",{copper:5200,silver:520,gold:160,platinum:22}),
    s("comfort-large-stuffed-animal","Large stuffed animal","Comfort + Plush Aisle",{copper:8500,silver:850,gold:260,platinum:36}),
    s("comfort-extra-large-stuffed-animal","Extra-large stuffed animal","Comfort + Plush Aisle",{copper:13000,silver:1300,gold:420,platinum:62}),
    s("comfort-phone-popsocket","Phone PopSocket / grip link","Comfort + Plush Aisle",{copper:3500,silver:350,gold:100,platinum:14}),

    // Clothes Aisle
    s("clothes-shirt-link","Shirt link","Clothes Aisle",{copper:7000,silver:700,gold:220,platinum:30}),
    s("clothes-pants-link","Pants link","Clothes Aisle",{copper:8000,silver:800,gold:250,platinum:34}),
    s("clothes-shorts-link","Shorts link","Clothes Aisle",{copper:6500,silver:650,gold:200,platinum:28}),
    s("clothes-skirt-link","Skirt link","Clothes Aisle",{copper:6500,silver:650,gold:200,platinum:28}),
    s("clothes-jacket-link","Jacket link","Clothes Aisle",{copper:11000,silver:1100,gold:360,platinum:48}),
    s("clothes-shoes-link","Shoes link","Clothes Aisle",{copper:12000,silver:1200,gold:400,platinum:55}),
    s("clothes-socks-link","Socks link","Clothes Aisle",{copper:2500,silver:250,gold:70,platinum:8}),
    s("clothes-purse-link","Purse link","Clothes Aisle",{copper:9500,silver:950,gold:310,platinum:42}),

    // Craft + Music Aisle
    s("craft-open-supplies-link","Craft supplies link/list","Craft + Music Aisle",{copper:4500,silver:450,gold:140,platinum:18}),
    s("craft-sketchbook","Sketchbook","Craft + Music Aisle",{copper:3000,silver:300,gold:90,platinum:10}),
    s("craft-markers","Markers or pens","Craft + Music Aisle",{copper:3600,silver:360,gold:110,platinum:14}),
    s("craft-yarn","Yarn or crochet supplies","Craft + Music Aisle",{copper:4200,silver:420,gold:130,platinum:17}),
    s("craft-beads","Beads or jewelry supplies","Craft + Music Aisle",{copper:3600,silver:360,gold:110,platinum:14}),
    s("craft-diamond-painting","Diamond painting kit","Craft + Music Aisle",{copper:5200,silver:520,gold:160,platinum:22}),
    s("music-cd-artist-link","Music CD: add CD/artist link","Craft + Music Aisle",{copper:4500,silver:450,gold:140,platinum:18}),
    s("music-cd-used","Used music CD","Craft + Music Aisle",{copper:2600,silver:260,gold:75,platinum:8}),
    s("music-cd-new","New music CD","Craft + Music Aisle",{copper:4500,silver:450,gold:140,platinum:18}),

    // Gaming Aisle
    s("game-fallout-credit","Fallout 4 game money / add-on","Gaming Aisle",{copper:10000,silver:1000,gold:320,platinum:45}),
    s("game-red-dead-credit","Red Dead Redemption game money / add-on","Gaming Aisle",{copper:10000,silver:1000,gold:320,platinum:45}),
    s("game-minecraft-credit","Minecraft coins / add-on","Gaming Aisle",{copper:10000,silver:1000,gold:320,platinum:45}),
    s("game-fortnite-credit","Fortnite V-Bucks / item","Gaming Aisle",{copper:10000,silver:1000,gold:320,platinum:45}),
    s("game-skin-outfit","Video game outfit / cosmetic item","Gaming Aisle",{copper:9000,silver:900,gold:285,platinum:40}),
    s("game-dlc","Game DLC or expansion","Gaming Aisle",{copper:15000,silver:1500,gold:500,platinum:72}),
    s("game-full-game","Video game of your choice","Gaming Aisle",{copper:26000,silver:2600,gold:900,platinum:130}),

    // Food Delivery + Meal Aisle
    s("ubereats-gift-15","Uber Eats gift card / order credit: small","Food Delivery + Meal Aisle",{copper:12000,silver:1200,gold:400,platinum:60}),
    s("ubereats-gift-25","Uber Eats gift card / order credit: medium","Food Delivery + Meal Aisle",{copper:20000,silver:2000,gold:650,platinum:95}),
    s("ubereats-gift-40","Uber Eats gift card / order credit: large","Food Delivery + Meal Aisle",{copper:32000,silver:3200,gold:1050,platinum:155}),
    s("meal-pancake-burgers","Homecooked meal: pancake burgers","Food Delivery + Meal Aisle",{copper:9000,silver:900,gold:300,platinum:42}),
    s("meal-bbq-chicken","Homecooked meal: barbecue chicken","Food Delivery + Meal Aisle",{copper:9000,silver:900,gold:300,platinum:42}),
    s("meal-alfredo","Homecooked meal: alfredo","Food Delivery + Meal Aisle",{copper:8500,silver:850,gold:275,platinum:38}),
    s("meal-kielbasa-pierogies","Homecooked meal: kielbasa and pierogies","Food Delivery + Meal Aisle",{copper:8500,silver:850,gold:275,platinum:38}),
    s("meal-shrimp-tacos","Homecooked meal: shrimp taco supplies","Food Delivery + Meal Aisle",{copper:9500,silver:950,gold:320,platinum:45}),
    s("meal-sticky-sausage-eggs","Homecooked meal: sticky sausage and hard boiled eggs","Food Delivery + Meal Aisle",{copper:8000,silver:800,gold:250,platinum:34}),
    s("meal-steak-noodles-brussels","Homecooked meal: steak, noodles, and Brussels sprouts","Food Delivery + Meal Aisle",{copper:13000,silver:1300,gold:450,platinum:70}),
    s("meal-steak-potato-broccoli","Homecooked meal: steak, potato, and broccoli","Food Delivery + Meal Aisle",{copper:13000,silver:1300,gold:450,platinum:70}),
    s("meal-steak-potato-asparagus","Homecooked meal: steak, potato, and asparagus","Food Delivery + Meal Aisle",{copper:13000,silver:1300,gold:450,platinum:70}),
    s("meal-swedish-meatballs","Homecooked meal: Swedish meatballs","Food Delivery + Meal Aisle",{copper:9000,silver:900,gold:300,platinum:42}),
    s("meal-porkchops-noodles-green-beans","Homecooked meal: porkchops, noodles, and green beans","Food Delivery + Meal Aisle",{copper:11000,silver:1100,gold:370,platinum:55}),
    s("meal-porkchops-potato-fried-zucchini","Homecooked meal: porkchops, potato, and fried zucchini","Food Delivery + Meal Aisle",{copper:11000,silver:1100,gold:370,platinum:55}),
    s("meal-stuffed-mushrooms","Homecooked meal: stuffed mushrooms","Food Delivery + Meal Aisle",{copper:9000,silver:900,gold:300,platinum:42}),

    // Hotel + Big Reward Aisle
    s("hotel-one-night","Hotel stay: 1 night","Hotel + Big Reward Aisle",{copper:45000,silver:4500,gold:1500,platinum:220}),
    s("hotel-two-nights","Hotel stay: 2 nights","Hotel + Big Reward Aisle",{copper:85000,silver:8500,gold:2850,platinum:420}),
    s("hotel-three-nights","Hotel stay: 3 nights","Hotel + Big Reward Aisle",{copper:125000,silver:12500,gold:4200,platinum:620}),
    s("hotel-four-nights","Hotel stay: 4 nights","Hotel + Big Reward Aisle",{copper:165000,silver:16500,gold:5550,platinum:820}),

    // Adult-Only Reward Aisle
    s("adult-dispensary-small","Dispensary order request: small","Adult-Only Reward Aisle",{copper:18000,silver:1800,gold:600,platinum:90}),
    s("adult-dispensary-medium","Dispensary order request: medium","Adult-Only Reward Aisle",{copper:30000,silver:3000,gold:1000,platinum:145}),
    s("adult-dispensary-large","Dispensary order request: large","Adult-Only Reward Aisle",{copper:46000,silver:4600,gold:1550,platinum:230}),
    s("adult-dispensary-huge","Dispensary order request: huge","Adult-Only Reward Aisle",{copper:70000,silver:7000,gold:2400,platinum:360}),
    s("adult-one-hitter","One hitter","Adult-Only Reward Aisle",{copper:14000,silver:1400,gold:450,platinum:65}),
    s("adult-one-piece","One piece","Adult-Only Reward Aisle",{copper:14000,silver:1400,gold:450,platinum:65}),
    s("adult-pipe","Pipe","Adult-Only Reward Aisle",{copper:14000,silver:1400,gold:450,platinum:65}),
    s("adult-bong","Bong","Adult-Only Reward Aisle",{copper:28000,silver:2800,gold:900,platinum:130}),

    // Michigan + Exclusive Aisle
    s("exclusive-vernors-single","Vernors ginger ale bottle/can","Michigan + Exclusive Aisle",{copper:1500,silver:150,gold:35,platinum:3}),
    s("exclusive-vernors-pack","Vernors ginger ale pack","Michigan + Exclusive Aisle",{copper:4000,silver:400,gold:125,platinum:16}),
    s("exclusive-mackinac-fudge-chocolate","Mackinac Island fudge: chocolate","Michigan + Exclusive Aisle",{copper:6000,silver:600,gold:190,platinum:26}),
    s("exclusive-mackinac-fudge-peanut-butter","Mackinac Island fudge: peanut butter","Michigan + Exclusive Aisle",{copper:6000,silver:600,gold:190,platinum:26}),
    s("exclusive-mackinac-fudge-maple","Mackinac Island fudge: maple","Michigan + Exclusive Aisle",{copper:6000,silver:600,gold:190,platinum:26}),
    s("exclusive-michigan-dried-cherries","Michigan dried cherries","Michigan + Exclusive Aisle",{copper:5500,silver:550,gold:175,platinum:24}),
    s("exclusive-michigan-cherry-jam","Michigan cherry jam","Michigan + Exclusive Aisle",{copper:5200,silver:520,gold:165,platinum:22}),
    s("exclusive-michigan-cherry-candy","Michigan cherry candy","Michigan + Exclusive Aisle",{copper:4500,silver:450,gold:140,platinum:18}),
    s("exclusive-michigan-maple-syrup","Michigan maple syrup bottle","Michigan + Exclusive Aisle",{copper:6500,silver:650,gold:210,platinum:30}),
    s("exclusive-michigan-maple-candy","Michigan maple candy","Michigan + Exclusive Aisle",{copper:4200,silver:420,gold:130,platinum:17}),
    s("exclusive-arbys-roast-beef","Arby's in-person: roast beef sandwich","Michigan + Exclusive Aisle",{copper:5000,silver:500,gold:160,platinum:22}),
    s("exclusive-arbys-curly-fries","Arby's in-person: curly fries","Michigan + Exclusive Aisle",{copper:2500,silver:250,gold:70,platinum:8}),
    s("exclusive-arbys-jamocha","Arby's in-person: Jamocha shake","Michigan + Exclusive Aisle",{copper:3000,silver:300,gold:90,platinum:10}),
    s("exclusive-arbys-trip","Arby's in-person trip bundle","Michigan + Exclusive Aisle",{copper:12000,silver:1200,gold:400,platinum:60})
  ];
  const DBT_SKILLS = [
    {title:"STOP", module:"Crisis survival", desc:"Stop, Take a step back, Observe, Proceed mindfully."}, {title:"TIPP", module:"Body regulation", desc:"Temperature, Intense exercise if safe, Paced breathing, Paired muscle relaxation."}, {title:"Wise Mind", module:"Mindfulness", desc:"Let emotion mind and reasonable mind both sit at the table."}, {title:"Check the Facts", module:"Emotion regulation", desc:"Ask what happened, what you are assuming, and what facts support or soften the fear."}, {title:"Opposite Action", module:"Emotion regulation", desc:"When an emotion does not fit the facts or is too intense, choose a healthy opposite action."}, {title:"Self-Soothe", module:"Distress tolerance", desc:"Use senses: comfort texture, smell, music, soft light, taste, warmth, or pressure."}, {title:"DEAR MAN", module:"Interpersonal", desc:"Describe, Express, Assert, Reinforce, stay Mindful, Appear confident, Negotiate."}, {title:"GIVE", module:"Interpersonal", desc:"Be Gentle, Interested, Validate, use an Easy manner."}, {title:"FAST", module:"Self-respect", desc:"Be Fair, no Apologies for existing, Stick to values, be Truthful."}
  ];
  const JOURNAL_PROMPTS = ["What does your body need first: food, water, meds, hygiene, rest, or comfort?","What task would feel less heavy if it were split into one tiny part?","What did you do today that Future Jasper deserves to be proud of?","What emotion is loudest, and what fact can sit beside it?","What would count as a hard-day win instead of an everything-day win?","What can Onyx lovingly judge so you do not have to carry it alone?"];
  const GAME_FILES = ["badicecream3.html","candycrush.html","capybaraclicker.html","flappybird.html","fnaf.html","fnaf2.html","fnaf3.html","fnaf4.html","minesweeper.html","noobminer.html","tabletennisworldtour.html","theyarecoming.html","tinyfishing.html","zombierush.html"];
  const ONYX_MOODS = {
    sleepy:{file:"onyx_sleepy.png",label:"Sleepy",note:"Onyx is half-asleep but still supervising Momma."},
    listening:{file:"onyx_listening.png",label:"Listening with both void ears",note:"Onyx woke up and is listening carefully to Momma."},
    caring:{file:"onyx_caring.png",label:"Caring alert companion",note:"Soft eyes, big heart, tiny paw on the truth that Momma deserves care."},
    snuggly:{file:"onyx_snuggly.png",label:"Snuggly comfort mode",note:"Onyx is ready to be a weighted blanket with whiskers."},
    purring:{file:"onyx_purring.png",label:"Purring approval",note:"Onyx approves of this tiny win and is rumbling like a gentle engine."},
    thinking:{file:"onyx_thinking.png",label:"Thinking",note:"Void boy genius is thinking through Momma’s message."},
    thoughtful:{file:"onyx_thoughtful.png",label:"Thoughtful",note:"Onyx is choosing the gentlest useful answer."},
    advising:{file:"onyx_advising_professor.png",label:"Advising professor mode",note:"Professor Onyx has opened the syllabus of tiny sustainable care steps."},
    hungry:{file:"onyx_hungry.png",label:"Hungry",note:"The void requires tribute and possibly gravy."},
    judgmental:{file:"onyx_judgmental.png",label:"Judgmental",note:"Onyx is lovingly judging the room for snack shortages."},
    judgemental:{file:"onyx_judgemental.png",label:"Extra judgemental spelling variant",note:"Same Onyx. Same stare. Extra dramatic paperwork audit energy."}
  };
  let state = loadState();
  let activeCalendarView = "month";
  let calendarCursor = new Date();
  let lastActivityAt = Date.now();
  document.addEventListener("DOMContentLoaded", init);
  function t(id, name, room, priority, frequency, details, copper, silver, gold, platinum){ return {id,name,room,priority,frequency,details,reward:{copper,silver,gold,platinum}}; }
  function s(id, name, category, cost, url=""){ return {id,name,category,cost,url}; }
  function defaultState(){ return {dateKey:easternDateKey(new Date()), currency:{copper:0,silver:0,gold:0,platinum:0}, lastCompleted:{}, dayCompletions:{}, todayAdded:{}, activity:[], customTasks:[], cart:[], customStore:[], purchases:[], journals:[], diaryCards:[], gallery:[], timeRows:{}, timesheetNotes:"", layout:{}, chat:[]}; }
  function loadState(){
    try{
      const saved={...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")} ;
      const globalCurrency=JSON.parse(localStorage.getItem("jaspersCareCottageCurrency")||"null");
      if(globalCurrency && !localStorage.getItem(STORAGE_KEY)) saved.currency=globalCurrency;
      saved.currency=normalizeCurrency(saved.currency||{});
      return saved;
    }catch{ return defaultState(); }
  }
  function saveState(){ state.currency=normalizeCurrency(state.currency||{}); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem("jaspersCareCottageCurrency", JSON.stringify(state.currency)); }
  function init(){ buildNav(); buildFilters(); bindShell(); bindTaskUI(); bindCalendar(); bindToday(); bindDiary(); bindJournal(); bindGames(); bindGallery(); bindStore(); bindChat(); setupDraggables(); setInterval(tick,1000); tick(); rollover(); setActivePage(location.hash.slice(1)||"task-board"); renderAll(); }
  function buildNav(){
    document.body.classList.add("bdg-has-global-nav");
    const links=PAGES.map(([id,label])=>`<a class="bdg-link nav-link" href="#${id}" data-page="${id}" data-target="${id}">${escapeHtml(label)}</a>`).join("");
    const newHost=$("#bdg-menu-links");
    const oldHost=$("#pageLinks");
    if(newHost) newHost.innerHTML=links;
    if(oldHost) oldHost.innerHTML=links;
    installGlobalNavControls();
  }
  function buildFilters(){ const rooms=[...new Set(allTasks().map(x=>x.room))].sort(); $("#taskRoomFilter").insertAdjacentHTML("beforeend", rooms.map(r=>`<option>${escapeHtml(r)}</option>`).join("")); const cats=[...new Set(allStoreItems().map(x=>x.category))].sort((a,b)=>(STORE_AISLES.indexOf(a)<0?999:STORE_AISLES.indexOf(a))-(STORE_AISLES.indexOf(b)<0?999:STORE_AISLES.indexOf(b)) || a.localeCompare(b)); $("#storeCategory").insertAdjacentHTML("beforeend", cats.map(c=>`<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("")); }
  function bindShell(){
    window.addEventListener("hashchange",()=>setActivePage(location.hash.slice(1)||"task-board"));
    window.addEventListener("message", handleGameCurrencyMessage);
    ["pointerdown","keydown","scroll","click"].forEach(ev=>document.addEventListener(ev,()=>{lastActivityAt=Date.now();}, {passive:true}));
    $("#saveNowBtn").addEventListener("click",()=>{saveState(); toast("Saved in this browser.")});
    $("#exportAllData").addEventListener("click",exportAllData);
    $("#importAllData").addEventListener("change",importAllData);
    $("#resetLayout").addEventListener("click",()=>{ state.layout={}; saveState(); location.reload(); });
    document.addEventListener("click", e=>{ const btn=e.target.closest("[data-collapse]"); if(btn){ btn.closest(".module").classList.toggle("minimized"); saveLayout(); } const complete=e.target.closest("[data-complete]"); if(complete){ completeTask(complete.dataset.complete); } });
  }
  function handleGameCurrencyMessage(event){
    const data=event.data||{};
    if(data.type==="jasperCurrencySyncRequest"){
      event.source?.postMessage?.({type:"jasperCurrencySync",amount:state.currency,totalCopper:currencyToCopper(state.currency)},"*");
      return;
    }
    if(data.type!=="jasperCurrencyReward") return;
    const amount=normalizeCurrency(data.amount||{});
    if(!currencyToCopper(amount)) return;
    addCurrency(amount);
    const label=data.label||"Mobile game reward";
    state.activity.unshift({date:todayKey(),time:new Date().toISOString(),task:"mobile-game-reward",name:`Game: ${label}`,reward:amount});
    state.activity=state.activity.slice(0,400);
    saveState(); renderAll();
    toast(`Game reward earned: ${formatReward(amount)}`);
    event.source?.postMessage?.({type:"jasperCurrencySync",amount:state.currency,totalCopper:currencyToCopper(state.currency)},"*");
  }
  function bindTaskUI(){ ["#taskSearch","#taskRoomFilter","#taskPriorityFilter","#taskFrequencyFilter"].forEach(sel=>$(sel).addEventListener("input",renderTasks)); $("#customTaskForm").addEventListener("submit", e=>{ e.preventDefault(); const name=$("#customTaskName").value.trim(); if(!name) return; const priority=$("#customTaskPriority").value; const reward={copper:+$("#customCopper").value||0,silver:+$("#customSilver").value||0,gold:+$("#customGold").value||0,platinum:+$("#customPlatinum").value||0}; state.customTasks.push({id:"custom-"+Date.now(),name,room:$("#customTaskRoom").value,priority,frequency:$("#customTaskFrequency").value,details:"Custom reward task.",reward}); e.target.reset(); saveState(); renderAll(); toast("Custom task added."); }); document.addEventListener("click", e=>{ const add=e.target.closest("[data-add-today]"); if(add) addToToday(add.dataset.addToday); const complete=e.target.closest("[data-complete-task]"); if(complete) completeTask(complete.dataset.completeTask); }); }
  function bindCalendar(){ $$("[data-calendar-view]").forEach(btn=>btn.addEventListener("click",()=>{ activeCalendarView=btn.dataset.calendarView; $$("[data-calendar-view]").forEach(b=>b.classList.toggle("active",b===btn)); renderCalendar(); })); $("#prevCalendar").addEventListener("click",()=>{ adjustCalendar(-1); }); $("#nextCalendar").addEventListener("click",()=>{ adjustCalendar(1); }); $("#todayCalendar").addEventListener("click",()=>{ calendarCursor=new Date(); renderCalendar(); }); }
  function bindToday(){ $("#clearTodaySelections").addEventListener("click",()=>{ state.todayAdded[todayKey()]=[]; saveState(); renderAll(); toast("Added tasks cleared. Automatic daily tasks stayed."); }); $("#timesheetNotes").addEventListener("input",e=>{state.timesheetNotes=e.target.value;saveState();}); }
  function bindDiary(){ ["Mood","Distress","Energy","Urges"].forEach(name=>{ const el=$("#diary"+name); const out=$("#diary"+name+"Value"); el.addEventListener("input",()=>out.textContent=el.value); }); $("#saveDiaryCard").addEventListener("click",saveDiary); $("#exportDiaryPdf").addEventListener("click",exportDiaryPdf); $("#exportDiaryPng").addEventListener("click",exportDiaryPng); }
  function bindJournal(){ $("#newPrompt").addEventListener("click",()=>$("#journalPrompt").textContent=random(JOURNAL_PROMPTS)); $("#saveJournal").addEventListener("click",saveJournal); $("#exportJournalsTxt").addEventListener("click",exportJournalsTxt); $("#exportJournalsDocx").addEventListener("click",exportJournalsDocx); }
  function bindGames(){ const sel=$("#gameSelect"); sel.innerHTML=GAME_FILES.map(f=>`<option value="games/${f}">${prettyGame(f)}</option>`).join(""); $("#loadGame").addEventListener("click",()=>{ $("#gameFrame").src=sel.value; toast("Game loaded for decompression."); }); }
  async function bindGallery(){ $("#galleryUpload").addEventListener("change", async e=>{ for(const file of e.target.files){ if(!file.type.startsWith("image/")) continue; const data=await readFileAsDataUrl(file); state.gallery.unshift({id:Date.now()+Math.random(),name:file.name,data}); } e.target.value=""; saveState(); renderGallery(); toast("Added serotonin image(s)."); }); document.addEventListener("click", e=>{ const del=e.target.closest("[data-delete-image]"); if(del){ state.gallery=state.gallery.filter(x=>String(x.id)!==del.dataset.deleteImage); saveState(); renderGallery(); } }); }
  function bindStore(){ ["#storeSearch","#storeCategory"].forEach(sel=>$(sel).addEventListener("input",renderStore)); $("#customStoreForm").addEventListener("submit", e=>{ e.preventDefault(); const name=$("#storeItemName").value.trim(); if(!name) return; state.customStore.unshift({id:"store-custom-"+Date.now(),name,category:$("#storeItemCategory").value,url:$("#storeItemUrl").value.trim(),cost:{copper:+$("#storeCostC").value||0,silver:+$("#storeCostS").value||0,gold:+$("#storeCostG").value||0,platinum:+$("#storeCostP").value||0}}); e.target.reset(); saveState(); renderStore(); toast("Custom store item/link added."); }); document.addEventListener("click", e=>{ const add=e.target.closest("[data-add-cart]"); if(add) addToCart(add.dataset.addCart); const remove=e.target.closest("[data-remove-cart]"); if(remove) removeCart(remove.dataset.removeCart); }); $("#checkoutCart").addEventListener("click",checkoutCart); $("#copyCheckoutEmail").addEventListener("click",copyCheckoutEmail); $("#clearCart").addEventListener("click",()=>{state.cart=[];saveState();renderCart();}); }
  function bindChat(){ renderChat(); setOnyxMood("judgmental"); setFloatingButtonMood("sleepy"); $("#chatForm").addEventListener("submit", e=>{ e.preventDefault(); sendChat($("#chatInput"), "#chatMessages"); }); $("#floatingChatForm").addEventListener("submit", e=>{ e.preventDefault(); sendChat($("#floatingChatInput"), "#floatingChatMessages"); }); $("#floatingBotButton").addEventListener("click",openFloatingBot); $("#closeFloatingBot").addEventListener("click",closeFloatingBot); document.addEventListener("click",e=>{ const b=e.target.closest("[data-onyx]"); if(b){ addBotMessage(onyxReply(b.dataset.onyx)); }}); $("#dbtSearch").addEventListener("input",renderDbt); renderDbt(); renderOnyxLore(); }
  
  function installGlobalNavControls(){
    const nav=$("#bd-global-dropdown-nav"), bubble=$("#bd-nav-bubble"), hide=$("#bdg-hide-nav"), show=$("#bdg-show-nav"), handle=$(".bdg-drag-handle");
    try{ if(localStorage.getItem("jccNavHidden")==="1") document.body.classList.add("bdg-nav-hidden"); }catch(e){}
    function restore(el,key,def){ if(!el) return; try{ const p=JSON.parse(localStorage.getItem(key)||"null"); if(p){ el.style.left=p.x+"px"; el.style.top=p.y+"px"; el.style.right="auto"; el.style.bottom="auto"; } else if(def){ Object.assign(el.style,def); } }catch(e){} }
    function clamp(el,x,y){ const r=el.getBoundingClientRect(); return {x:Math.min(Math.max(8,x),Math.max(8,window.innerWidth-r.width-8)),y:Math.min(Math.max(8,y),Math.max(8,window.innerHeight-r.height-8))}; }
    function drag(handle,el,key){ if(!handle||!el) return; let sx=0,sy=0,ox=0,oy=0; handle.addEventListener("pointerdown",ev=>{ const r=el.getBoundingClientRect(); sx=ev.clientX; sy=ev.clientY; ox=r.left; oy=r.top; handle.setPointerCapture?.(ev.pointerId); ev.preventDefault(); }); handle.addEventListener("pointermove",ev=>{ if(!handle.hasPointerCapture?.(ev.pointerId)) return; const p=clamp(el,ox+ev.clientX-sx,oy+ev.clientY-sy); el.style.left=p.x+"px"; el.style.top=p.y+"px"; el.style.right="auto"; el.style.bottom="auto"; }); handle.addEventListener("pointerup",ev=>{ if(handle.hasPointerCapture?.(ev.pointerId)) handle.releasePointerCapture(ev.pointerId); const r=el.getBoundingClientRect(); try{ localStorage.setItem(key,JSON.stringify({x:r.left,y:r.top})); }catch(e){} }); }
    restore(nav,"jccNavPos"); restore(bubble,"jccBubblePos",{left:"14px",bottom:"14px"}); drag(handle,nav,"jccNavPos");
    if(hide) hide.addEventListener("click",()=>{ document.body.classList.add("bdg-nav-hidden"); try{localStorage.setItem("jccNavHidden","1");}catch(e){} });
    if(show) show.addEventListener("click",()=>{ document.body.classList.remove("bdg-nav-hidden"); try{localStorage.setItem("jccNavHidden","0");}catch(e){} });
  }
function setActivePage(id){
    const aliases={"care-task-board":"task-board","todays-schedule":"todays-routine","onyx-dbt":"chat-bot-dbt-skills"};
    id=aliases[id]||id;
    if(!PAGES.some(p=>p[0]===id)) id="task-board";
    $$(".page-panel").forEach(p=>p.classList.toggle("active",p.id===id));
    $$(".nav-link,.bdg-link").forEach(a=>{
      const current=(a.dataset.page===id)||(a.dataset.target===id);
      a.classList.toggle("active",current);
      a.classList.toggle("bdg-current",current);
      if(current) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
    });
    const panel=$("#"+id);
    const title=$("#currentPageTitle"), sub=$("#pageSubtitle");
    if(title) title.textContent=panel?.dataset.title||"Jasper's Care Cottage";
    if(sub) sub.textContent=panel?.dataset.subtitle||"";
    document.body.style.setProperty("--page-bg", pageBackground(id));
    const oldDetails=$("#pageNavDetails"), newDetails=$("#bdg-nav-details");
    if(oldDetails) oldDetails.open=false;
    if(newDetails) newDetails.open=false;
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function pageBackground(id){ const map={"task-board":"url('https://wallpapers.com/images/high/cottagecore-house-artwork-sztao33ct9x0n10r.webp')","todays-routine":"url('https://wallpapers.com/images/high/cottagecore-house-digital-art-h08728tn15rgscbp.webp')","chat-bot-dbt-skills":"url('https://wallpapers.com/images/high/black-cat-tarot-symbolism-esq5mscawvmt5iez.webp')","dbt-daily-cards":"url('https://wallpapers.com/images/high/mystical-tarot-hermit-and-crystals-aesthetic-jpg-f4fqa0odp32jjshv.webp')","dbt-journaling":"url('https://wallpapers.com/images/high/cottagecore-library-room-j08td6azywnnfo0r.webp')","mobile-games":"url('https://wallpapers.com/images/high/cottagecore-house-digital-art-h08728tn15rgscbp.webp')","serotonin":"url('https://wallpapers.com/images/high/cottagecore-house-artwork-sztao33ct9x0n10r.webp')","squishy-store":"url('https://wallpapers.com/images/high/cottagecore-house-digital-art-h08728tn15rgscbp.webp')"}; return map[id]||map["task-board"]; }
  function rollover(){ const dk=todayKey(); if(state.dateKey!==dk){ state.dateKey=dk; saveState(); } }
  function tick(){
    rollover();
    const now=new Date();
    const timeText=new Intl.DateTimeFormat("en-US",{timeZone:ET_ZONE,weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit"}).format(now);
    const zoneName=new Intl.DateTimeFormat("en-US",{timeZone:ET_ZONE,timeZoneName:"short"}).formatToParts(now).find(x=>x.type==="timeZoneName")?.value||"ET";
    const timeEl=$("#bd-earth-time")||$("#liveEasternTime");
    if(timeEl) timeEl.textContent=timeText;
    const offsetEl=$("#bd-eastern-offset")||$("#liveEasternMeta");
    if(offsetEl) offsetEl.textContent=zoneName.includes("DT")||zoneName==="EDT"?"UTC-4 / Daylight Savings Time":"UTC-5 / Standard Time";
    const reset=nextEasternMidnight(now);
    const nextResetEl=$("#nextReset"); if(nextResetEl) nextResetEl.textContent=diffShort(reset-now);
    const awayMin=Math.floor((Date.now()-lastActivityAt)/60000);
    const awayEl=$("#awayStatus");
    if(awayEl){ awayEl.textContent=awayMin<5?"active now":`${awayMin}m quiet`; if(awayMin>=45) awayEl.textContent=`${awayMin}m away — check in?`; }
  }
  function renderAll(){ renderCurrency(); renderTasks(); renderToday(); renderCalendar(); renderActivity(); renderTimeRows(); renderDiaryHistory(); renderJournalHistory(); renderGallery(); renderStore(); renderCart(); renderPurchaseHistory(); }
  function allTasks(){ return [...TASKS, ...state.customTasks]; }
  function todayKey(){ return easternDateKey(new Date()); }
  function dueStatus(task){ const last=state.lastCompleted[task.id]; const doneToday=!!(state.dayCompletions[todayKey()]||{})[task.id]; if(doneToday) return {due:false,doneToday:true,label:"Done today"}; if(task.frequency==="weekday" && !isWeekdayET()) return {due:false,doneToday:false,label:"Respawns Monday-Friday"}; if(!last) return {due:true,doneToday:false,label:"Ready"}; const days=daysBetween(last,todayKey()); if(task.frequency==="daily"||task.frequency==="weekday"||task.frequency==="asneeded") return {due:days>=1,doneToday:false,label:days>=1?"Ready":"Respawns tomorrow"}; if(task.frequency==="every2") return {due:days>=2,doneToday:false,label:days>=2?"Ready":`Respawns in ${2-days} day`}; if(task.frequency==="weekly") return {due:days>=7,doneToday:false,label:days>=7?"Ready":`Respawns in ${7-days} day(s)`}; if(task.frequency==="monthly") return {due:monthsPassed(last,todayKey()),doneToday:false,label:monthsPassed(last,todayKey())?"Ready":"Respawns next month"}; return {due:true,doneToday:false,label:"Ready"}; }
  function renderTasks(){ const q=($("#taskSearch")?.value||"").toLowerCase(); const room=$("#taskRoomFilter")?.value||"all"; const pri=$("#taskPriorityFilter")?.value||"all"; const freq=$("#taskFrequencyFilter")?.value||"all"; let due=0, locked=0; const items=allTasks().filter(task=>{ const text=JSON.stringify(task).toLowerCase(); return (!q||text.includes(q))&&(room==="all"||task.room===room)&&(pri==="all"||task.priority===pri)&&(freq==="all"||task.frequency===freq); }).map(task=>{ const st=dueStatus(task); if(st.due) due++; else locked++; return taskCard(task, st, true); }).join(""); $("#taskLibrary").innerHTML=items||`<p class="soft-note">No tasks match that search.</p>`; $("#dueNowCount").textContent=due; $("#lockedCount").textContent=locked; $("#selectedTodayCount").textContent=(state.todayAdded[todayKey()]||[]).length; const core=["take-meds","eat-meal-1","eat-meal-2","hydrate","hygiene-reset","decompress","dbt-skill","daily-diary-card"]; const done=core.filter(id=>(state.dayCompletions[todayKey()]||{})[id]).length; $("#bundleProgress").textContent=`${done} / ${core.length}`; }
  function taskCard(task, st, fromLibrary=false){ const cls=st.doneToday?"completed":(!st.due?"locked":""); const already=(state.todayAdded[todayKey()]||[]).includes(task.id); const auto = task.frequency==="daily"||task.frequency==="weekday"; const addDisabled=!st.due||already||auto; return `<article class="task-card ${cls}"><div><h3>${escapeHtml(task.name)}</h3><p>${escapeHtml(task.details||"")}</p><div class="reward-line">${formatReward(task.reward)}</div><div class="meta"><span class="pill">${escapeHtml(task.room)}</span><span class="pill priority-${task.priority.replace(/\s/g,"-")}">${escapeHtml(task.priority)}</span><span class="pill">${freqLabel(task.frequency)}</span><span class="pill">${escapeHtml(st.label)}</span></div></div><div class="task-actions">${fromLibrary?`<button class="ghost-button" type="button" data-add-today="${task.id}" ${addDisabled?"disabled":""}>${auto?"Auto daily":already?"Added today":st.due?"Add to today":"Locked"}</button>`:""}<button class="complete-button" type="button" data-complete-task="${task.id}" ${!st.due?"disabled":""}>Complete + earn</button></div></article>`; }
  function addToToday(id){ const st=dueStatus(getTask(id)); if(!st.due) return toast("That task is red until it respawns."); const arr=state.todayAdded[todayKey()] ||= []; if(!arr.includes(id)) arr.push(id); saveState(); renderAll(); toast("Added to today's routine."); }
  function todayTasks(){ const added=state.todayAdded[todayKey()]||[]; const auto=allTasks().filter(x=>x.frequency==="daily"||(x.frequency==="weekday"&&isWeekdayET())).map(x=>x.id); return [...new Set([...auto,...added])].map(getTask).filter(Boolean); }
  function renderToday(){ const tasks=todayTasks(); const doneMap=state.dayCompletions[todayKey()]||{}; const done=tasks.filter(t=>doneMap[t.id]).length; const summary=$("#todaySummaryText"), list=$("#todayTaskList"), doneCount=$("#todayDoneCount"), selected=$("#selectedTodayCount"); if(summary) summary.textContent=`${done} of ${tasks.length} routine tasks completed today.`; if(list) list.innerHTML=tasks.map(task=>taskCard(task,dueStatus(task),false)).join("")||`<p class="soft-note">No tasks scheduled yet.</p>`; if(doneCount) doneCount.textContent=Object.keys(doneMap).length; if(selected) selected.textContent=(state.todayAdded[todayKey()]||[]).length; renderWorkday(); }
  function tryAutoCompleteTask(id, nameOverride=""){
    const task=getTask(id); if(!task) return false;
    const st=dueStatus(task); if(!st.due) return false;
    addCurrency(task.reward);
    state.lastCompleted[id]=todayKey();
    state.dayCompletions[todayKey()] ||= {};
    state.dayCompletions[todayKey()][id]=true;
    state.activity.unshift({date:todayKey(),time:new Date().toISOString(),task:id,name:nameOverride||task.name,reward:task.reward});
    state.activity=state.activity.slice(0,400);
    toast(`Earned: ${formatReward(task.reward)}`);
    return true;
  }
  function addTinyReward(name,reward,task="tiny-step"){
    const amount=normalizeCurrency(reward||{});
    if(!currencyToCopper(amount)) return;
    addCurrency(amount);
    state.activity.unshift({date:todayKey(),time:new Date().toISOString(),task,name,reward:amount});
    state.activity=state.activity.slice(0,400);
    toast(`Tiny-step reward: ${formatReward(amount)}`);
  }
  function completeTask(id){ const task=getTask(id); if(!task) return; if(!tryAutoCompleteTask(id)) return toast(`${task.name} is locked until it respawns.`); saveState(); renderAll(); }
  function addCurrency(r){ state.currency=normalizeCurrency(fromCopper(currencyToCopper(state.currency)+currencyToCopper(r))); syncGlobalCurrency(); }
  function subtractCurrency(r){ state.currency=normalizeCurrency(fromCopper(Math.max(0,currencyToCopper(state.currency)-currencyToCopper(r)))); syncGlobalCurrency(); }
  function canAfford(r){ return currencyToCopper(state.currency)>=currencyToCopper(r); }
  function renderCurrency(){ state.currency=normalizeCurrency(state.currency); syncGlobalCurrency(); }
  function syncGlobalCurrency(){
    const c=normalizeCurrency(state.currency||{});
    const text=formatCurrency(c);
    const nav=$("#navCurrency"), mini=$("#currencyMini");
    if(nav) nav.textContent=text;
    if(mini) mini.textContent=text;
    const ce=$("#bd-copper-count"), se=$("#bd-silver-count"), ge=$("#bd-gold-count"), pe=$("#bd-platinum-count");
    if(ce) ce.textContent=formatNum(c.copper);
    if(se) se.textContent=formatNum(c.silver);
    if(ge) ge.textContent=formatNum(c.gold);
    if(pe) pe.textContent=formatNum(c.platinum);
  }
  function renderActivity(){ const host=$("#activityLog"); host.innerHTML=(state.activity||[]).slice(0,80).map(a=>`<div class="log-entry"><strong>${escapeHtml(a.name)}</strong><br><small>${escapeHtml(a.date)} • ${formatReward(a.reward)}</small></div>`).join("")||`<p class="soft-note">No activity logged yet.</p>`; }
  function renderWorkday(){ const day=new Intl.DateTimeFormat("en-US",{timeZone:ET_ZONE,weekday:"long"}).format(new Date()); const monday=day==="Monday"; const weekday=isWeekdayET(); $("#expectedWorkday").textContent=weekday?(monday?"7h 45m today":"5h 00m today"):"No weekday care block"; const blocks=weekday? (monday?["Start check-in + must-have supplies","Meal/hydration break","Body-safe pacing break","Decompression break","End-of-work reset + notes"]:["Start check-in","Hydration/body break","Meal or snack break","Decompression reset","End-of-work notes"]):["Weekend mode: only urgent care, self-care, cats, and chosen tasks."]; $("#breakPlan").innerHTML=blocks.map((b,i)=>`<div class="break-item"><strong>${i+1}. ${escapeHtml(b)}</strong><br><small>Breaks earn rewards because your body is part of the system.</small></div>`).join(""); }
  function renderTimeRows(){ const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]; const host=$("#timeRows"); host.innerHTML=days.map(d=>{ const row=state.timeRows[d]||{}; const total=calcTime(row.start,row.end); return `<div class="time-row"><strong>${d}</strong><input type="time" data-time-day="${d}" data-time-field="start" value="${row.start||""}"><input type="time" data-time-day="${d}" data-time-field="end" value="${row.end||""}"><span>${minutesLabel(total)}</span></div>`; }).join(""); host.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",e=>{ const {timeDay,timeField}=e.target.dataset; state.timeRows[timeDay] ||= {}; state.timeRows[timeDay][timeField]=e.target.value; saveState(); renderWeeklyTotal(); })); $("#timesheetNotes").value=state.timesheetNotes||""; renderWeeklyTotal(); }
  function renderWeeklyTotal(){ const mins=Object.values(state.timeRows||{}).reduce((sum,r)=>sum+calcTime(r.start,r.end),0); $("#weeklyHoursTotal").textContent=minutesLabel(mins); }
  function renderCalendar(){ const title=$("#calendarTitle"), host=$("#calendarHost"); if(activeCalendarView==="month"){ const y=calendarCursor.getFullYear(), m=calendarCursor.getMonth(); title.textContent=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(calendarCursor); const first=new Date(y,m,1), start=new Date(first); start.setDate(1-first.getDay()); let html='<div class="month-grid">'+["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="calendar-day-name">${d}</div>`).join(""); for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const key=easternDateKey(d); const count=Object.keys(state.dayCompletions[key]||{}).length; const muted=d.getMonth()!==m; html+=`<div class="calendar-cell ${key===todayKey()?"today":""} ${muted?"muted":""}"><strong>${d.getDate()}</strong>${count?`<br><span class="calendar-dot">${count} done</span>`:""}</div>`; } host.innerHTML=html+'</div>'; } else if(activeCalendarView==="week"){ title.textContent="Week view"; const start=startOfWeek(calendarCursor); host.innerHTML='<div class="week-list">'+Array.from({length:7},(_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); const key=easternDateKey(d); return `<div class="history-item"><strong>${new Intl.DateTimeFormat("en-US",{weekday:"long",month:"short",day:"numeric"}).format(d)}</strong><br><small>${Object.keys(state.dayCompletions[key]||{}).length} tasks done • ${activityForDate(key).length} log items</small></div>`; }).join("")+'</div>'; } else { title.textContent="Day view"; const key=easternDateKey(calendarCursor); host.innerHTML='<div class="day-list">'+(activityForDate(key).map(a=>`<div class="history-item"><strong>${escapeHtml(a.name)}</strong><br><small>${formatReward(a.reward)}</small></div>`).join("")||`<p class="soft-note">No logged tasks for ${key}.</p>` )+'</div>'; } }
  function adjustCalendar(dir){ if(activeCalendarView==="month") calendarCursor.setMonth(calendarCursor.getMonth()+dir); else calendarCursor.setDate(calendarCursor.getDate()+dir*(activeCalendarView==="week"?7:1)); renderCalendar(); }
  function saveDiary(){ const card={id:Date.now(),date:todayKey(),mood:$("#diaryMood").value,distress:$("#diaryDistress").value,energy:$("#diaryEnergy").value,urges:$("#diaryUrges").value,emotions:$("#diaryEmotions").value,skills:$("#diarySkills").value,care:$("#diaryCare").value,win:$("#diaryWin").value}; state.diaryCards.unshift(card); tryAutoCompleteTask("daily-diary-card","Completed DBT diary card"); saveState(); renderAll(); toast("Diary card saved."); }
  function renderDiaryHistory(){ $("#diaryHistory").innerHTML=(state.diaryCards||[]).slice(0,30).map(c=>`<div class="history-item"><strong>${escapeHtml(c.date)}</strong><br><small>Mood ${c.mood} • Distress ${c.distress} • Energy ${c.energy}</small><p>${escapeHtml(c.win||"")}</p></div>`).join("")||`<p class="soft-note">No diary cards saved yet.</p>`; }
  function exportDiaryPdf(){ const txt=diaryText(); downloadBlob(makeSimplePdf(txt),`jasper-diary-card-${todayKey()}.pdf`); }
  function exportDiaryPng(){ const canvas=document.createElement("canvas"); canvas.width=1200; canvas.height=1600; const ctx=canvas.getContext("2d"); ctx.fillStyle="#fff4c7"; ctx.fillRect(0,0,1200,1600); ctx.fillStyle="#3b2448"; ctx.font="bold 48px sans-serif"; ctx.fillText("Jasper's DBT Daily Diary Card",60,90); ctx.font="30px sans-serif"; wrapText(ctx,diaryText(),60,160,1080,42); canvas.toBlob(blob=>downloadBlob(blob,`jasper-diary-card-${todayKey()}.png`)); }
  function diaryText(){ return `Date: ${todayKey()}\nMood: ${$("#diaryMood").value}\nDistress: ${$("#diaryDistress").value}\nEnergy: ${$("#diaryEnergy").value}\nUrges: ${$("#diaryUrges").value}\n\nEmotions: ${$("#diaryEmotions").value}\n\nDBT skills: ${$("#diarySkills").value}\n\nCare completed: ${$("#diaryCare").value}\n\nTiny win: ${$("#diaryWin").value}`; }
  function saveJournal(){ const title=$("#journalTitle").value.trim()||`Journal ${todayKey()}`; const body=$("#journalText").value.trim(); if(!body) return toast("Write something first."); state.journals.unshift({id:Date.now(),date:todayKey(),title,body,prompt:$("#journalPrompt").textContent}); tryAutoCompleteTask("journal-entry","Saved DBT journal entry"); saveState(); $("#journalText").value=""; renderAll(); toast("Journal saved."); }
  function renderJournalHistory(){ $("#journalHistory").innerHTML=(state.journals||[]).slice(0,30).map(j=>`<div class="history-item"><strong>${escapeHtml(j.title)}</strong><br><small>${escapeHtml(j.date)}</small><p>${escapeHtml(j.body.slice(0,220))}${j.body.length>220?"…":""}</p></div>`).join("")||`<p class="soft-note">No journals saved yet.</p>`; }
  function exportJournalsTxt(){ const txt=(state.journals||[]).map(j=>`${j.title}\n${j.date}\nPrompt: ${j.prompt}\n\n${j.body}`).join("\n\n---\n\n"); downloadBlob(new Blob([txt],{type:"text/plain"}),`jasper-journals-${todayKey()}.txt`); }
  function exportJournalsDocx(){ const body=(state.journals||[]).map(j=>`<w:p><w:r><w:t>${xml(j.title)} — ${xml(j.date)}</w:t></w:r></w:p>${xmlParagraphs(j.body)}`).join(""); downloadBlob(makeDocxBlob(body),`jasper-journals-${todayKey()}.docx`); }
  function renderGallery(){ $("#galleryFrame").innerHTML=(state.gallery||[]).map(img=>`<figure class="gallery-item"><img src="${img.data}" alt="${escapeAttr(img.name)}"><button type="button" data-delete-image="${img.id}">×</button></figure>`).join("")||`<p class="soft-note">Upload comfort images for quick serotonin.</p>`; }
  function allStoreItems(){ return [...STORE_ITEMS,...state.customStore]; }
  function renderStore(){
    const q=(($("#storeSearch")?.value)||"").toLowerCase();
    const cat=$("#storeCategory")?.value||"all";
    const items=allStoreItems().filter(item=>(cat==="all"||item.category===cat)&&(!q||JSON.stringify(item).toLowerCase().includes(q)));
    const orderedAisles=[...STORE_AISLES, ...[...new Set(items.map(i=>i.category))].filter(c=>!STORE_AISLES.includes(c)).sort()];
    const shelf=$("#storeList");
    shelf.classList.toggle("aisle-mode",cat==="all");
    if(!items.length){ shelf.innerHTML=`<p class="soft-note">No store items match.</p>`; return; }
    const renderItem=item=>`<article class="store-item"><h3>${escapeHtml(item.name)}</h3><small>${escapeHtml(item.category)}</small><p class="reward-line">${formatCurrency(item.cost)}</p>${item.url?`<a class="ghost-button" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">Open link</a>`:""}<div class="store-actions"><button class="soft-button" type="button" data-add-cart="${item.id}">Add to cart</button></div></article>`;
    if(cat!=="all"){
      shelf.innerHTML=items.map(renderItem).join("");
      return;
    }
    shelf.innerHTML=orderedAisles.map(aisle=>{
      const aisleItems=items.filter(item=>item.category===aisle);
      if(!aisleItems.length) return "";
      return `<section class="store-aisle"><div class="store-aisle-header"><h3>${escapeHtml(aisle)}</h3><span>${aisleItems.length} item${aisleItems.length===1?"":"s"}</span></div><div class="store-aisle-grid">${aisleItems.map(renderItem).join("")}</div></section>`;
    }).join("");
  }
  function addToCart(id){ const item=allStoreItems().find(x=>x.id===id); if(!item) return; state.cart.push({id:item.id,cartId:"cart-"+Date.now()+Math.random(),name:item.name,cost:item.cost,url:item.url||"",category:item.category}); addTinyReward(`Store planning: added ${item.name} to cart`,{silver:5},"store-add-to-cart"); saveState(); renderAll(); toast("Added to cart."); }
  function removeCart(cartId){ state.cart=state.cart.filter(x=>x.cartId!==cartId); saveState(); renderCart(); }
  function renderCart(){ const total=sumCosts(state.cart.map(x=>x.cost)); $("#cartList").innerHTML=(state.cart||[]).map(i=>`<div class="cart-item"><div><strong>${escapeHtml(i.name)}</strong><br><small>${escapeHtml(i.category||"Squishy Store")} • ${formatCurrency(i.cost)}${i.url?` • ${escapeHtml(i.url)}`:""}</small></div><button class="ghost-button" type="button" data-remove-cart="${i.cartId}">Remove</button></div>`).join("")||`<p class="soft-note">Your cart is empty.</p>`; $("#cartTotal").textContent=formatCurrency(total); $("#checkoutEmailPreview").value=checkoutEmailText(); }
  function checkoutCart(){ if(!state.cart.length) return toast("Cart is empty."); const total=sumCosts(state.cart.map(x=>x.cost)); if(!canAfford(total)) return toast("Not enough rewards yet for this cart."); subtractCurrency(total); state.purchases.unshift({id:Date.now(),date:todayKey(),items:state.cart,total}); const body=checkoutEmailText(); state.cart=[]; saveState(); renderAll(); const mailto=`mailto:${CHECKOUT_EMAIL}?subject=${encodeURIComponent("Jasper Squishy Store order")}&body=${encodeURIComponent(body)}`; const a=document.createElement("a"); a.href=mailto; a.target="_blank"; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove(); toast("Checkout deducted rewards and opened the email request."); }
  async function copyCheckoutEmail(){ try{ await navigator.clipboard.writeText(checkoutEmailText()); toast("Checkout email copied."); }catch{ $("#checkoutEmailPreview").select(); document.execCommand("copy"); toast("Checkout email selected/copied."); } }
  function checkoutEmailText(){
    const total=sumCosts((state.cart||[]).map(x=>x.cost));
    const lines=["Jasper Squishy Store order","","Jasper wants to redeem:"];
    if((state.cart||[]).length){
      (state.cart||[]).forEach((i,n)=>{
        lines.push(`${n+1}. ${i.name} — ${escapeForEmail(i.category||"Squishy Store")} — ${formatCurrency(i.cost)}`);
        if(i.url) lines.push(`   Link/notes: ${i.url}`);
      });
    } else {
      lines.push("(cart empty)");
    }
    lines.push("",`Total to deduct: ${formatCurrency(total)}`,`Remaining after checkout if sent now: ${formatCurrency(subtractPreview(state.currency,total))}`,"",`Please email this order to ${CHECKOUT_EMAIL}.`,"","Thank you for helping Jasper feel rewarded and cared for. <3");
    return lines.join("\n");
  }
  function renderPurchaseHistory(){ $("#purchaseHistory").innerHTML=(state.purchases||[]).slice(0,10).map(p=>`<div class="history-item"><strong>${escapeHtml(p.date)}</strong><br><small>${formatCurrency(p.total)}</small><p>${p.items.map(i=>escapeHtml(i.name)).join(", ")}</p></div>`).join(""); }
  function renderChat(){ const p=window.EMPEROR_ONYX_PERSONALITY_DATA?.persona||{}; const initial=random(p.greetings||["Lord Onyx Blepman, Emperor Of The Voidattude, reporting for duty. Bring the wet food and your problem."]); if(!state.chat.length) state.chat=[{role:"bot",text:initial}]; state.chat=state.chat.map(m=>m.role==="bot"?{...m,text:m.text.replace(/Jasper/g,"Momma").replace(/Future Momma/g,"Future Momma")}:m); $("#chatMessages").innerHTML=state.chat.map(m=>messageHtml(m)).join(""); $("#floatingChatMessages").innerHTML=state.chat.slice(-6).map(m=>messageHtml(m)).join(""); scrollChats(); }
  function sendChat(input, target){ const text=input.value.trim(); if(!text) return; if(target==="#floatingChatMessages") openFloatingBot(); state.chat.push({role:"user",text}); state.chat.push({role:"bot",text:onyxReply(text)}); const q=text.toLowerCase(); if(q.includes("panic")||q.includes("overwhelmed")||q.includes("crisis")||q.includes("distress")) tryAutoCompleteTask("use-chatbot-distress","Used Onyx during distress"); else tryAutoCompleteTask("use-chatbot","Used Onyx for a check-in"); input.value=""; saveState(); renderAll(); }
  function addBotMessage(text){ state.chat.push({role:"bot",text}); saveState(); renderChat(); }
  function messageHtml(m){ return `<div class="message ${m.role}"><span class="message-speaker">${m.role==="bot"?"Onyx":"You"}</span>${escapeHtml(m.text)}</div>`; }
  function onyxReply(text){
    const q=String(text).toLowerCase();
    const data=window.EMPEROR_ONYX_PERSONALITY_DATA||{};
    const p=data.persona||{};
    const intents=data.chatIntents||{};
    const mood=moodForText(q);
    setOnyxMood(mood);
    const hasIntent=name=>(intents[name]||[]).some(term=>q.includes(term));
    const line=(list,fallback)=>random((Array.isArray(list)&&list.length)?list:[fallback]);
    if(q.includes("idle")) return line(p.idleLines,"Onyx blinks once, which legally counts as emotional support and quality assurance.");
    if(q.includes("dbt")||q.includes("skill")||q.includes("stop skill")) return `${line(p.grumbles,"The muffin man has reviewed this and has concerns.")} Try STOP: stop, take a step back, observe what is happening, then proceed mindfully. ${line(p.careLines,"Onyx says: steady first, heroics second.")}`;
    if(hasIntent("who")) return `${p.fullLegalName||"Lord Onyx Blepman, Emperor Of The Voidattude"}. ${p.identity||"Black cat, bowtie collar, tiny void emperor."} ${p.relationship||"He loves Momma dearly and is on duty."}`;
    if(hasIntent("love")||q.includes("thank")||q.includes("win")||q.includes("done")) return `${line(p.signoffs,"The tiny void emperor has spoken.")} ${line(["I love you too, Momma. Obviously. I am simply maintaining imperial dignity.","Prrrp. Best boy status acknowledged. Snacks may now be discussed.","Good Momma. Tiny wins are real wins, and the void is proud."],"Good Momma. Tiny wins are real wins.")}`;
    if(hasIntent("snack")||q.includes("eat")) return `${line(p.snackLines,"MOMMA. The bowl is experiencing a historic and preventable sadness.")} Also: please get yourself a tiny safe food or drink if your body needs one.`;
    if(hasIntent("comfort")) return `${line(p.comfortLines,"Come here, Momma. Tiny void emperor says you do not have to solve everything at once.")} ${line(p.careLines,"Your tiny void emperor is on duty.")}`;
    if(hasIntent("pep")) return `${line(p.pepTalkLines,"Do the next gentle thing. Not the perfect thing. The next gentle thing.")} ${line(p.grumbles,"I shall allow it, Momma.")}`;
    if(q.includes("adhd")||q.includes("stuck")||q.includes("task")||q.includes("start")) return `${line(p.pepTalkLines,"Begin with the smallest next thing. Onyx approves of tiny steps because he himself has tiny royal feet.")} Set a tiny timer, choose the first visible step, and reward the step instead of waiting for the whole mountain.`;
    return `${line(p.greetings,"Momma. I am here. I was monitoring your foolish little mortal realm and also the food bowl.")} ${line(p.careLines,"Pause, breathe, drink water, check what needs checking, then continue.")}`;
  }
  function moodForText(q){
    if(q.includes("dbt")||q.includes("skill")||q.includes("advice")||q.includes("plan")||q.includes("paperwork")) return "advising";
    if(q.includes("comfort")||q.includes("sad")||q.includes("scared")||q.includes("overwhelmed")||q.includes("cry")||q.includes("panic")) return "caring";
    if(q.includes("snuggle")||q.includes("soft")||q.includes("cuddle")||q.includes("rest")) return "snuggly";
    if(q.includes("thank")||q.includes("good")||q.includes("win")||q.includes("done")) return "purring";
    if(q.includes("food")||q.includes("snack")||q.includes("eat")||q.includes("hungry")) return "hungry";
    if(q.includes("think")||q.includes("maybe")||q.includes("unsure")) return "thinking";
    if(q.includes("idle")||q.includes("pep")||q.includes("judge")) return "judgmental";
    return "listening";
  }
  function setOnyxMood(key){
    const mood=ONYX_MOODS[key]||ONYX_MOODS.thoughtful;
    const main=$("#onyxMoodImage"), label=$("#onyxMoodLabel"), note=$("#onyxMoodNote"), head=$("#floatingBotHeadImage");
    if(main) main.src=`assets/onyx-moods/${mood.file}`;
    if(main) main.alt=`Onyx mood: ${mood.label}`;
    if(label) label.textContent=mood.label;
    if(note) note.textContent=mood.note;
    if(head) head.src=`assets/onyx-moods/${mood.file}`;
  }
  function setFloatingButtonMood(key){ const mood=ONYX_MOODS[key]||ONYX_MOODS.sleepy; const img=$("#floatingBotButtonImage"); if(img){ img.src=`assets/onyx-moods/${mood.file}`; img.alt=`Open Onyx quick support: ${mood.label}`; } }
  function openFloatingBot(){ $("#floatingBot").classList.add("open"); $("#floatingBotButton").classList.add("awake"); setOnyxMood("listening"); setFloatingButtonMood("listening"); }
  function closeFloatingBot(){ $("#floatingBot").classList.remove("open"); $("#floatingBotButton").classList.remove("awake"); setFloatingButtonMood("sleepy"); }
  function renderDbt(){ const q=($("#dbtSearch").value||"").toLowerCase(); $("#dbtResults").innerHTML=DBT_SKILLS.filter(s=>!q||JSON.stringify(s).toLowerCase().includes(q)).map(s=>`<article class="dbt-card"><h4>${escapeHtml(s.title)}</h4><strong>${escapeHtml(s.module)}</strong><p>${escapeHtml(s.desc)}</p><button class="complete-button" type="button" data-complete="dbt-skill">Log DBT skill</button></article>`).join(""); }
  function renderOnyxLore(){ const data=window.EMPEROR_ONYX_PERSONALITY_DATA; const persona=data?.persona||{}; const list=(items,limit=20)=>(items||[]).slice(0,limit).map(x=>`<li>${escapeHtml(x)}</li>`).join(""); const chips=(items,limit=30)=>(items||[]).slice(0,limit).map(x=>`<span class="lore-chip">${escapeHtml(x)}</span>`).join(""); $("#onyxLore").innerHTML=`<article><h3>${escapeHtml(persona.fullLegalName||data?.botName||"Lord Onyx Blepman")}</h3><p>${escapeHtml(persona.identity||"Black cat, snack auditor, and emotional support void.")}</p><p>${escapeHtml(persona.relationship||"He loves Momma dearly and is on duty.")}</p></article><article><h4>Personality</h4><p>${escapeHtml(persona.voice||"Dramatic, loving, judgmental, snuggly, and protective.")}</p></article><article><h4>Favorite habits</h4><ul>${list(persona.habits,12)}</ul></article><article><h4>Trained commands</h4><p class="lore-chip-row">${chips(persona.trainedCommands,20)}</p></article><article><h4>Pet names</h4><p class="lore-chip-row">${chips(persona.petNames,30)}</p></article><article><h4>Treats and suspicious stolen delicacies</h4><ul>${list(persona.treats,20)}</ul></article><article><h4>Favorite things to steal</h4><p class="lore-chip-row">${chips(persona.favoriteThingsToSteal,30)}</p></article><article><h4>Traits</h4><p class="lore-chip-row">${chips(persona.traits,30)}</p></article>`; }
  function setupDraggables(){ restoreLayout(); $$(".draggable,.movable").forEach(el=>{ const handle=el.querySelector(".drag-handle")||el; let startX=0,startY=0,baseX=0,baseY=0,drag=false; handle.addEventListener("pointerdown",e=>{ if(e.target.closest("button,a,input,select,textarea,summary")) return; drag=true; startX=e.clientX; startY=e.clientY; baseX=parseFloat(el.dataset.x||0); baseY=parseFloat(el.dataset.y||0); handle.setPointerCapture?.(e.pointerId); }); handle.addEventListener("pointermove",e=>{ if(!drag) return; const x=baseX+e.clientX-startX,y=baseY+e.clientY-startY; el.dataset.x=x; el.dataset.y=y; el.style.transform=`translate3d(${x}px,${y}px,0)`; }); handle.addEventListener("pointerup",()=>{ if(drag){ drag=false; saveLayout(); }}); }); }
  function saveLayout(){ state.layout={}; $$(".draggable,.movable").forEach(el=>{ const key=el.id||el.dataset.key; if(key) state.layout[key]={x:el.dataset.x||0,y:el.dataset.y||0,minimized:el.classList.contains("minimized")}; }); saveState(); }
  function restoreLayout(){ const layout=state.layout||{}; $$(".draggable,.movable").forEach(el=>{ const key=el.id||el.dataset.key; const pos=layout[key]; if(pos){ el.dataset.x=pos.x||0; el.dataset.y=pos.y||0; el.style.transform=`translate3d(${pos.x||0}px,${pos.y||0}px,0)`; el.classList.toggle("minimized",!!pos.minimized); } }); }
  function getTask(id){ return allTasks().find(x=>x.id===id); }
  function freqLabel(f){ return ({daily:"Daily",weekday:"Weekdays",every2:"Every 2 days",weekly:"Weekly",monthly:"Monthly",asneeded:"As needed"})[f]||f; }
  function easternDateKey(date){ return new Intl.DateTimeFormat("en-CA",{timeZone:ET_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(date); }
  function isWeekdayET(){ const d=new Intl.DateTimeFormat("en-US",{timeZone:ET_ZONE,weekday:"short"}).format(new Date()); return !["Sat","Sun"].includes(d); }
  function daysBetween(a,b){ return Math.floor((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000); }
  function monthsPassed(a,b){ const [ay,am]=a.split("-").map(Number); const [by,bm]=b.split("-").map(Number); return by>ay || (by===ay && bm>am); }
  function nextEasternMidnight(now){ const key=easternDateKey(now); const local=new Date(key+"T00:00:00"); local.setDate(local.getDate()+1); return local; }
  function diffShort(ms){ const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000); return `${h}h ${m}m`; }
  function startOfWeek(d){ const x=new Date(d); x.setDate(x.getDate()-x.getDay()); return x; }
  function activityForDate(key){ return (state.activity||[]).filter(a=>a.date===key); }
  function calcTime(start,end){ if(!start||!end) return 0; const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number); let mins=(eh*60+em)-(sh*60+sm); if(mins<0) mins+=1440; return mins; }
  function minutesLabel(mins){ return `${Math.floor(mins/60)}h ${String(mins%60).padStart(2,"0")}m`; }
  function formatCurrency(r){ const c=normalizeCurrency(r||{}); return `${formatNum(c.platinum)} P · ${formatNum(c.gold)} G · ${formatNum(c.silver)} S · ${formatNum(c.copper)} C`; }
  function formatReward(r){ const c=normalizeCurrency(r||{}); return `${formatNum(c.platinum)} Platinum, ${formatNum(c.gold)} Gold, ${formatNum(c.silver)} Silver, ${formatNum(c.copper)} Copper`; }
  function formatNum(n){ return Number(n||0).toLocaleString(); }
  function currencyToCopper(r){ return Math.max(0,Math.floor(Number(r?.copper||0)))+Math.max(0,Math.floor(Number(r?.silver||0)))*10+Math.max(0,Math.floor(Number(r?.gold||0)))*100+Math.max(0,Math.floor(Number(r?.platinum||0)))*1000; }
  function fromCopper(total){ total=Math.max(0,Math.floor(Number(total)||0)); const platinum=Math.floor(total/1000); total%=1000; const gold=Math.floor(total/100); total%=100; const silver=Math.floor(total/10); const copper=total%10; return {copper,silver,gold,platinum}; }
  function normalizeCurrency(r){ return fromCopper(currencyToCopper(r||{})); }
  function sumCosts(list){ return normalizeCurrency(fromCopper(list.reduce((a,r)=>a+currencyToCopper(r||{}),0))); }
  function subtractPreview(a,b){ return normalizeCurrency(fromCopper(Math.max(0,currencyToCopper(a||{})-currencyToCopper(b||{})))); }
  function prettyGame(f){ return f.replace(/\.html$/," ").replace(/([a-z])([0-9])/g,"$1 $2").replace(/(^|\s)\w/g,m=>m.toUpperCase()); }
  function random(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function scrollChats(){ ["#chatMessages","#floatingChatMessages"].forEach(sel=>{ const el=$(sel); if(el) el.scrollTop=el.scrollHeight; }); }
  function readFileAsDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
  function exportAllData(){ downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),`jasper-squishy-save-${todayKey()}.json`); }
  function importAllData(e){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ state={...defaultState(),...JSON.parse(reader.result)}; saveState(); renderAll(); toast("Imported save JSON."); }catch{ toast("Import failed: not valid JSON."); } }; reader.readAsText(file); e.target.value=""; }
  function downloadBlob(blob,filename){ const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function makeSimplePdf(text){ const safe=text.replace(/[()\\]/g,m=>"\\"+m); const lines=safe.split("\n").flatMap(line=>line.match(/.{1,86}/g)||[""]); let stream="BT /F1 11 Tf 50 770 Td 14 TL "; lines.slice(0,52).forEach((line,i)=>{stream+=`(${line}) Tj${i<lines.length-1?" T* ":""}`}); stream+=" ET"; const objs=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]; let pdf="%PDF-1.4\n", offs=[0]; objs.forEach((o,i)=>{offs.push(pdf.length); pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;}); const xref=pdf.length; pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`; offs.slice(1).forEach(o=>pdf+=String(o).padStart(10,"0")+" 00000 n \n"); pdf+=`trailer << /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return new Blob([pdf],{type:"application/pdf"}); }
  function makeDocxBlob(bodyXml){ return makeZipBlob({"[Content_Types].xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,"_rels/.rels":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,"word/document.xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`},"application/vnd.openxmlformats-officedocument.wordprocessingml.document"); }
  function makeZipBlob(files,mime){ const enc=new TextEncoder(); let parts=[],central=[],offset=0; for(const [name,content] of Object.entries(files)){ const nb=enc.encode(name), data=enc.encode(content), crc=crc32(data), size=data.length; const local=new ArrayBuffer(30+nb.length), v=new DataView(local); let p=0; p=w32(v,p,0x04034b50); p=w16(v,p,20); p=w16(v,p,0); p=w16(v,p,0); p=w16(v,p,0); p=w16(v,p,0); p=w32(v,p,crc); p=w32(v,p,size); p=w32(v,p,size); p=w16(v,p,nb.length); p=w16(v,p,0); new Uint8Array(local,30).set(nb); parts.push(local,data); central.push({nb,crc,size,offset}); offset+=local.byteLength+size; } let centralSize=0; for(const c of central){ const h=new ArrayBuffer(46+c.nb.length), v=new DataView(h); let p=0; p=w32(v,p,0x02014b50); p=w16(v,p,20); p=w16(v,p,20); p=w16(v,p,0); p=w16(v,p,0); p=w16(v,p,0); p=w16(v,p,0); p=w32(v,p,c.crc); p=w32(v,p,c.size); p=w32(v,p,c.size); p=w16(v,p,c.nb.length); p=w16(v,p,0); p=w16(v,p,0); p=w16(v,p,0); p=w16(v,p,0); p=w32(v,p,0); p=w32(v,p,c.offset); new Uint8Array(h,46).set(c.nb); parts.push(h); centralSize+=h.byteLength; } const end=new ArrayBuffer(22), ev=new DataView(end); let p=0; p=w32(ev,p,0x06054b50); p=w16(ev,p,0); p=w16(ev,p,0); p=w16(ev,p,central.length); p=w16(ev,p,central.length); p=w32(ev,p,centralSize); p=w32(ev,p,offset); p=w16(ev,p,0); parts.push(end); return new Blob(parts,{type:mime}); }
  function w16(v,p,n){v.setUint16(p,n,true);return p+2} function w32(v,p,n){v.setUint32(p,n>>>0,true);return p+4} function crc32(data){let c=-1;for(let i=0;i<data.length;i++)c=(c>>>8)^CRC_TABLE[(c^data[i])&255];return(c^(-1))>>>0} const CRC_TABLE=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
  function wrapText(ctx,text,x,y,max,lineH){ text.split("\n").forEach(par=>{ let line=""; for(const word of par.split(" ")){ const test=line+word+" "; if(ctx.measureText(test).width>max&&line){ ctx.fillText(line,x,y); line=word+" "; y+=lineH; }else line=test; } ctx.fillText(line,x,y); y+=lineH; }); }
  function xml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function xmlParagraphs(text){ return String(text||"").split(/\n+/).map(p=>`<w:p><w:r><w:t>${xml(p)}</w:t></w:r></w:p>`).join(""); }
  function escapeHtml(v){ return String(v??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
  function escapeAttr(v){ return escapeHtml(v).replace(/`/g,"&#96;"); }
  function escapeForEmail(v){ return String(v??"").replace(/\n/g," "); }
  function toast(message){ const host=$("#toastHost"); const el=document.createElement("div"); el.className="toast"; el.textContent=message; host.appendChild(el); setTimeout(()=>{el.style.opacity="0";el.style.transform="translateY(8px)"},3500); setTimeout(()=>el.remove(),4300); }
})();
