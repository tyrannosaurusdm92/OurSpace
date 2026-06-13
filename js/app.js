(() => {
  "use strict";
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const STORAGE_KEY = "jasper-squishy-care-cottage-v3";
  const CHECKOUT_EMAIL = "williamsaville92@gmail.com";
  const ET_ZONE = "America/New_York";
  const PAGES = [
    ["task-board", "Care Task Board"], ["todays-routine", "Today's Schedule"], ["chat-bot-dbt-skills", "Onyx Support"], ["dbt-daily-cards", "DBT Daily Cards"], ["dbt-journaling", "DBT Journaling"], ["mobile-games", "Mobile Games"], ["serotonin", "Serotonin"], ["squishy-store", "Squishy Store"]
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
    t("use-chatbot","Use Onyx support chat for a check-in","DBT","High","daily","Onyx support counts before things become a crisis.",1600,160,40,4),
    t("use-chatbot-distress","Use Onyx support chat during distress","DBT","Very High","asneeded","Reaching for Onyx support during distress is huge.",3600,360,120,16),
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
  const JOURNAL_PROMPTS = ["What does your body need first: food, water, meds, hygiene, rest, or comfort?","What task would feel less heavy if it were split into one tiny part?","What did you do today that Future Jasper deserves to be proud of?","What emotion is loudest, and what fact can sit beside it?","What would count as a hard-day win instead of an everything-day win?","What thought can you treat more gently so you do not have to carry it alone?"];
  const GAME_FILES = ["angrybirds.html", "baconmaydie.html", "badicecream3.html", "badpiggies.html", "bubbleshooter.html", "candycrush.html", "capybaraclicker.html", "ducklife5.html", "escapingtheprison.html", "fancypantsadventure2.html", "flappybird.html", "fnaf.html", "fnaf4.html", "fruitninja.html", "minesweeper.html", "noobminer.html", "plantsvszombies.html", "tabletennisworldtour.html", "tinyfishing.html", "tunnelrush.html", "webecomewhatwebehold.html", "zombierush.html"];
  const SUPPORT_MOODS = {
    "caring": {
        "label": "Caring",
        "note": "Onyx is soft-pawing Momma through a hard moment.",
        "image": "assets/onyx-moods/onyx_caring.png",
        "linePool": "caringLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_2_soft_witness",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "listening": {
        "label": "Listening",
        "note": "Onyx is listening first, no rushing, no shame.",
        "image": "assets/onyx-moods/onyx_listening.png",
        "linePool": "listeningLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_2_soft_witness",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "snuggly": {
        "label": "Snuggly",
        "note": "Onyx is being a tiny weighted blanket with opinions.",
        "image": "assets/onyx-moods/onyx_snuggly.png",
        "linePool": "snugglyLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_2_soft_witness",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "advising_professor": {
        "label": "Advising Professor",
        "note": "Professor Onyx has glasses, jacket, clipboard, and a tiny-step plan.",
        "image": "assets/onyx-moods/onyx_advising_professor.png",
        "linePool": "advisorLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_2_soft_witness",
            "level_3_tiny_step_coach",
            "level_4_skill_professor"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "purring": {
        "label": "Purring",
        "note": "Onyx is purring Momma’s nervous system into a softer gear.",
        "image": "assets/onyx-moods/onyx_purring.png",
        "linePool": "purringLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_2_soft_witness",
            "level_5_safety_anchor"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "thinking": {
        "label": "Thinking",
        "note": "Void boy genius is thinking through Momma’s message.",
        "image": "assets/onyx-moods/onyx_thinking.png",
        "linePool": "thinkingLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_2_soft_witness",
            "level_3_tiny_step_coach",
            "level_4_skill_professor"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "thoughtful": {
        "label": "Thoughtful",
        "note": "Onyx is choosing the gentlest useful answer.",
        "image": "assets/onyx-moods/onyx_thoughtful.png",
        "linePool": "thoughtfulLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_2_soft_witness",
            "level_3_tiny_step_coach",
            "level_4_skill_professor"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "judgmental": {
        "label": "Judgmental",
        "note": "Onyx only uses this look when Momma says food, meds-as-prescribed, bathing, hydration, self-care, or Onyx snack tribute has been skipped; it stays loving, protective, and never cruel.",
        "image": "assets/onyx-moods/onyx_judgmental.png",
        "linePool": "judgmentalLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "judgemental": {
        "label": "Judgemental",
        "note": "Alternate spelling supported; same loving skipped-care or missing-tribute rule as judgmental.",
        "image": "assets/onyx-moods/onyx_judgemental.png",
        "linePool": "judgmentalLines",
        "aliasFor": "judgmental",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "sleepy": {
        "label": "Sleepy",
        "note": "Onyx is half-asleep on Papa’s legs, the ottoman, the bookshelf, or his personal Luis Vuitton pillow, but still supervising Momma.",
        "image": "assets/onyx-moods/onyx_sleepy.png",
        "linePool": "sleepyLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_2_soft_witness",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    },
    "hungry": {
        "label": "Hungry",
        "note": "The void requires tribute and possibly gravy.",
        "image": "assets/onyx-moods/onyx_hungry.png",
        "linePool": "hungryLines",
        "relationshipCanon": "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.",
        "communicationDepths": [
            "level_1_quick_paw",
            "level_2_soft_witness",
            "level_3_tiny_step_coach"
        ],
        "sleepLoreAnchors": [
            "Papa’s legs",
            "the ottoman",
            "the bookshelf",
            "his personal Luis Vuitton pillow"
        ]
    }
};
  const memoryStorageFallback = {};
  let state = loadState();
  let activeCalendarView = "month";
  let calendarCursor = new Date();
  let lastActivityAt = Date.now();
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once:true });
    else fn();
  }
  ready(init);
  function t(id, name, room, priority, frequency, details, copper, silver, gold, platinum){ return {id,name,room,priority,frequency,details,reward:{copper,silver,gold,platinum}}; }
  function s(id, name, category, cost, url=""){ return {id,name,category,cost,url}; }
  function defaultState(){ return {dateKey:easternDateKey(new Date()), currency:{copper:0,silver:0,gold:0,platinum:0}, lastCompleted:{}, dayCompletions:{}, todayAdded:{}, activity:[], customTasks:[], cart:[], customStore:[], purchases:[], journals:[], diaryCards:[], gallery:[], mediaConnections:{tiktok:{url:"",notes:"",connected:false,updatedAt:""},spotify:{url:"",notes:"",connected:false,updatedAt:""},youtube:{url:"",notes:"",connected:false,updatedAt:""}}, gameSession:{active:false,selectedGame:"",lastLoadedAt:"",lastQuitAt:"",saveReason:""}, timeRows:{}, timesheetNotes:"", layout:{}, chat:[], scannerReports:[]}; }
  function isPlainObject(value){ return !!value && typeof value === "object" && !Array.isArray(value); }
  function asObject(value){ return isPlainObject(value) ? value : {}; }
  function asArray(value){ return Array.isArray(value) ? value : []; }
  function sanitizeSavedState(raw){
    const base=defaultState();
    const source=asObject(raw);
    const saved={...base, ...source};

    saved.currency=normalizeCurrency(asObject(saved.currency));
    ["activity","customTasks","cart","customStore","purchases","journals","diaryCards","gallery","chat","scannerReports"].forEach((key)=>{ saved[key]=asArray(saved[key]); });
    ["lastCompleted","dayCompletions","todayAdded","timeRows","layout"].forEach((key)=>{ saved[key]=asObject(saved[key]); });

    Object.keys(saved.todayAdded).forEach((key)=>{ saved.todayAdded[key]=asArray(saved.todayAdded[key]); });
    Object.keys(saved.dayCompletions).forEach((key)=>{ saved.dayCompletions[key]=asObject(saved.dayCompletions[key]); });
    Object.keys(saved.timeRows).forEach((key)=>{ saved.timeRows[key]=asObject(saved.timeRows[key]); });
    Object.keys(saved.layout).forEach((key)=>{ saved.layout[key]=asObject(saved.layout[key]); });

    saved.mediaConnections={...base.mediaConnections, ...asObject(saved.mediaConnections)};
    Object.keys(base.mediaConnections).forEach((key)=>{ saved.mediaConnections[key]={...base.mediaConnections[key], ...asObject(saved.mediaConnections[key])}; });
    saved.gameSession={...base.gameSession, ...asObject(saved.gameSession)};
    saved.timesheetNotes=typeof saved.timesheetNotes === "string" ? saved.timesheetNotes : "";
    saved.dateKey=typeof saved.dateKey === "string" && saved.dateKey ? saved.dateKey : base.dateKey;
    return saved;
  }
  function loadState(){
    let raw={};
    try{ raw=JSON.parse(storageGet(STORAGE_KEY,"{}")); }
    catch(err){ recordBootError("loadState: saved JSON was invalid and was reset", err); raw={}; }
    const saved=sanitizeSavedState(raw);
    try{
      const globalCurrency=JSON.parse(storageGet("jaspersCareCottageCurrency","null"));
      if(globalCurrency && !storageGet(STORAGE_KEY,"")) saved.currency=normalizeCurrency(asObject(globalCurrency));
    }catch(err){ recordBootError("loadState: legacy currency was invalid and was ignored", err); }
    return saved;
  }
  function saveState(){ state=sanitizeSavedState(state); storageSet(STORAGE_KEY, JSON.stringify(state)); storageSet("jaspersCareCottageCurrency", JSON.stringify(state.currency)); }
  function recordBootError(name, err){
    try{
      window.__JCC_BOOT_ERRORS__ ||= [];
      window.__JCC_BOOT_ERRORS__.push({step:name, message:String(err && (err.message||err)), at:new Date().toISOString()});
    }catch(_err){}
  }
  function safeStep(name, fn){
    try{ return fn(); }
    catch(err){ recordBootError(name, err); console.error("[JCC]", name, err); return undefined; }
  }
  function storageGet(key, fallback=""){
    try{
      const value = window.localStorage.getItem(key);
      return value == null ? fallback : value;
    }catch(err){
      if(Object.prototype.hasOwnProperty.call(memoryStorageFallback, key)) return memoryStorageFallback[key];
      recordBootError("storageGet: localStorage unavailable for " + key, err);
      return fallback;
    }
  }
  function storageSet(key, value){
    const text = String(value);
    try{ window.localStorage.setItem(key, text); }
    catch(err){ memoryStorageFallback[key] = text; recordBootError("storageSet: using in-memory fallback for " + key, err); }
  }
  function init(){
    if(window.__JCC_APP_STARTED__) return;
    window.__JCC_APP_STARTED__ = true;
    [["buildNav",buildNav],["buildFilters",buildFilters],["bindShell",bindShell],["bindTaskUI",bindTaskUI],["bindCalendar",bindCalendar],["bindToday",bindToday],["bindDiary",bindDiary],["bindJournal",bindJournal],["bindGames",bindGames],["bindGallery",bindGallery],["bindSerotoninMedia",bindSerotoninMedia],["bindStore",bindStore],["bindChat",bindChat],["setupDraggables",setupDraggables]].forEach(([name,fn])=>safeStep(name,fn));
    setInterval(()=>safeStep("tick",tick),1000);
    safeStep("tick",tick);
    safeStep("rollover",rollover);
    safeStep("setActivePage",()=>setActivePage(location.hash.slice(1)||"task-board"));
    safeStep("renderAll",renderAll);
    window.__JCC_READY__ = true;
  }
  function buildNav(){
    document.body.classList.add("bdg-has-global-nav");
    const links=PAGES.map(([id,label])=>`<a class="bdg-link nav-link" href="#${id}" data-page="${id}" data-target="${id}">${escapeHtml(label)}</a>`).join("");
    const newHost=$("#bdg-menu-links");
    const oldHost=$("#pageLinks");
    if(newHost) newHost.innerHTML=links;
    if(oldHost) oldHost.innerHTML=links;
    installGlobalNavControls();
  }
  function buildFilters(){ const rooms=[...new Set(allTasks().map(x=>x.room))].sort(); const roomFilter=$("#taskRoomFilter"); if(roomFilter) roomFilter.insertAdjacentHTML("beforeend", rooms.map(r=>`<option>${escapeHtml(r)}</option>`).join("")); const cats=[...new Set(allStoreItems().map(x=>x.category))].sort((a,b)=>(STORE_AISLES.indexOf(a)<0?999:STORE_AISLES.indexOf(a))-(STORE_AISLES.indexOf(b)<0?999:STORE_AISLES.indexOf(b)) || a.localeCompare(b)); const storeCategory=$("#storeCategory"); if(storeCategory) storeCategory.insertAdjacentHTML("beforeend", cats.map(c=>`<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("")); }
  function bindShell(){
    window.addEventListener("hashchange",()=>setActivePage(location.hash.slice(1)||"task-board"));
    document.addEventListener("click", e=>{
      const link=e.target.closest(".nav-link,.bdg-link,[data-page],[data-target]");
      if(!link || !link.matches("a,button")) return;
      const page=link.dataset.page || link.dataset.target || (link.getAttribute("href")||"").replace(/^#/,"");
      if(!page || !PAGES.some(p=>p[0]===page)) return;
      e.preventDefault();
      if(location.hash.slice(1)!==page) location.hash=page;
      setActivePage(page);
    });
    window.addEventListener("message", handleGameCurrencyMessage);
    ["pointerdown","keydown","scroll","click"].forEach(ev=>document.addEventListener(ev,()=>{lastActivityAt=Date.now();}, {passive:true}));
    $("#saveNowBtn").addEventListener("click",()=>{saveState(); toast("Saved in this browser.")});
    $("#exportAllData").addEventListener("click",exportAllData);
    $("#importAllData").addEventListener("change",importAllData);
    $("#resetLayout").addEventListener("click",()=>{ state.layout={}; saveState(); location.reload(); });
    document.addEventListener("click", e=>{ const btn=e.target.closest("[data-collapse]"); if(btn){ const module=btn.closest(".module"); const willMinimize=module && !module.classList.contains("minimized"); const gameRelated=module && (module.dataset.key==="games-module" || !!module.closest("#mobile-games")); if(gameRelated && willMinimize) quitActiveGame("collapsed gaming module"); module?.classList.toggle("minimized"); refreshModuleBubbleLabels(); saveLayout(); } const complete=e.target.closest("[data-complete]"); if(complete){ completeTask(complete.dataset.complete); } });
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
  function bindGames(){
    const sel=$("#gameSelect"), frame=$("#gameFrame");
    if(!sel||!frame) return;
    sel.innerHTML=GAME_FILES.map(f=>`<option value="games/${f}">${prettyGame(f)}</option>`).join("");
    if(state.gameSession?.selectedGame) sel.value=state.gameSession.selectedGame;
    $("#loadGame").addEventListener("click",()=>{
      const gameUrl=sel.value;
      state.gameSession={active:true,selectedGame:gameUrl,lastLoadedAt:new Date().toISOString(),lastQuitAt:state.gameSession?.lastQuitAt||"",saveReason:"loaded"};
      saveState();
      frame.src=gameUrl;
      toast("Game loaded for decompression. Collapsing Gaming Mode saves and quits the iframe.");
    });
    frame.addEventListener("load",()=>{
      try{ frame.contentWindow?.postMessage({type:"jasperCurrencySync",amount:state.currency,totalCopper:currencyToCopper(state.currency)},"*"); }catch{}
      renderGameSessionStatus();
    });
    renderGameSessionStatus();
  }
  async function bindGallery(){ $("#galleryUpload").addEventListener("change", async e=>{ for(const file of e.target.files){ if(!file.type.startsWith("image/")) continue; const data=await readFileAsDataUrl(file); state.gallery.unshift({id:Date.now()+Math.random(),name:file.name,data}); } e.target.value=""; saveState(); renderGallery(); toast("Added serotonin image(s)."); }); document.addEventListener("click", e=>{ const del=e.target.closest("[data-delete-image]"); if(del){ state.gallery=state.gallery.filter(x=>String(x.id)!==del.dataset.deleteImage); saveState(); renderGallery(); } }); }
function bindSerotoninMedia(){
  const pairs=[
    ["tiktok","#tiktokProfileUrl","#tiktokComfortNotes","#saveTikTokConnection"],
    ["spotify","#spotifyUrl","#spotifyNotes","#saveSpotifyConnection"],
    ["youtube","#youtubePlaylistUrl","#youtubeNotes","#saveYouTubeConnection"]
  ];
  pairs.forEach(([key,urlSel,notesSel,btnSel])=>{
    const btn=$(btnSel);
    if(!btn) return;
    btn.addEventListener("click",()=>saveMediaConnection(key,urlSel,notesSel));
  });
  document.addEventListener("click",e=>{
    const opener=e.target.closest("[data-open-media]");
    if(!opener) return;
    const key=opener.dataset.openMedia;
    const url=state.mediaConnections?.[key]?.url;
    if(url) window.open(url,"_blank","noopener");
    else toast(`Save a ${key} link first.`);
  });
  renderSerotoninMedia();
}
  function bindStore(){ ["#storeSearch","#storeCategory"].forEach(sel=>$(sel).addEventListener("input",renderStore)); $("#customStoreForm").addEventListener("submit", e=>{ e.preventDefault(); const name=$("#storeItemName").value.trim(); if(!name) return; state.customStore.unshift({id:"store-custom-"+Date.now(),name,category:$("#storeItemCategory").value,url:$("#storeItemUrl").value.trim(),cost:{copper:+$("#storeCostC").value||0,silver:+$("#storeCostS").value||0,gold:+$("#storeCostG").value||0,platinum:+$("#storeCostP").value||0}}); e.target.reset(); saveState(); renderStore(); toast("Custom store item/link added."); }); document.addEventListener("click", e=>{ const add=e.target.closest("[data-add-cart]"); if(add) addToCart(add.dataset.addCart); const remove=e.target.closest("[data-remove-cart]"); if(remove) removeCart(remove.dataset.removeCart); }); $("#checkoutCart").addEventListener("click",checkoutCart); $("#copyCheckoutEmail").addEventListener("click",copyCheckoutEmail); $("#clearCart").addEventListener("click",()=>{state.cart=[];saveState();renderCart();}); }
  function bindChat(){ renderChat(); setSupportMood("caring"); setFloatingButtonMood("caring"); $("#chatForm").addEventListener("submit", e=>{ e.preventDefault(); sendChat($("#chatInput"), "#chatMessages"); }); $("#floatingChatForm").addEventListener("submit", e=>{ e.preventDefault(); sendChat($("#floatingChatInput"), "#floatingChatMessages"); }); $("#floatingBotButton").addEventListener("click",openFloatingBot); $("#closeFloatingBot").addEventListener("click",closeFloatingBot); document.addEventListener("click",e=>{ const b=e.target.closest("[data-support]"); if(b){ const result=supportAnswer(quickSupportInputFor(b.dataset.support)); addBotMessage(result.text,result.mood); }}); $("#dbtSearch").addEventListener("input",renderDbt); renderDbt(); renderSupportResources(); }
  
  function installGlobalNavControls(){
    const nav=$("#bd-global-dropdown-nav"), bubble=$("#bd-nav-bubble"), hide=$("#bdg-hide-nav"), show=$("#bdg-show-nav"), handle=$(".bdg-drag-handle");
    try{ if(storageGet("jccNavHidden","")==="1") document.body.classList.add("bdg-nav-hidden"); }catch(e){}
    function restore(el,key,def){ if(!el) return; try{ const p=JSON.parse(storageGet(key,"null")); if(p){ el.style.left=p.x+"px"; el.style.top=p.y+"px"; el.style.right="auto"; el.style.bottom="auto"; } else if(def){ Object.assign(el.style,def); } }catch(e){} }
    function clamp(el,x,y){ const r=el.getBoundingClientRect(); return {x:Math.min(Math.max(8,x),Math.max(8,window.innerWidth-r.width-8)),y:Math.min(Math.max(8,y),Math.max(8,window.innerHeight-r.height-8))}; }
    function drag(handle,el,key){ if(!handle||!el) return; let sx=0,sy=0,ox=0,oy=0; handle.addEventListener("pointerdown",ev=>{ const r=el.getBoundingClientRect(); sx=ev.clientX; sy=ev.clientY; ox=r.left; oy=r.top; handle.setPointerCapture?.(ev.pointerId); ev.preventDefault(); }); handle.addEventListener("pointermove",ev=>{ if(!handle.hasPointerCapture?.(ev.pointerId)) return; const p=clamp(el,ox+ev.clientX-sx,oy+ev.clientY-sy); el.style.left=p.x+"px"; el.style.top=p.y+"px"; el.style.right="auto"; el.style.bottom="auto"; }); handle.addEventListener("pointerup",ev=>{ if(handle.hasPointerCapture?.(ev.pointerId)) handle.releasePointerCapture(ev.pointerId); const r=el.getBoundingClientRect(); try{ storageSet(key,JSON.stringify({x:r.left,y:r.top})); }catch(e){} }); }
    restore(nav,"jccNavPos"); restore(bubble,"jccBubblePos",{left:"14px",bottom:"14px"}); drag(handle,nav,"jccNavPos");
    if(hide) hide.addEventListener("click",()=>{ document.body.classList.add("bdg-nav-hidden"); try{storageSet("jccNavHidden","1");}catch(e){} });
    if(show) show.addEventListener("click",()=>{ document.body.classList.remove("bdg-nav-hidden"); try{storageSet("jccNavHidden","0");}catch(e){} });
  }
function setActivePage(id){
    const aliases={"care-task-board":"task-board","todays-schedule":"todays-routine","support-dbt":"chat-bot-dbt-skills"};
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
    document.body.dataset.activePage=id;
    document.body.style.setProperty("--page-bg", pageBackground(id));
    window.dispatchEvent(new CustomEvent("jcc:pagechange",{detail:{page:id}}));
    const oldDetails=$("#pageNavDetails"), newDetails=$("#bdg-nav-details");
    if(oldDetails) oldDetails.open=false;
    if(newDetails) newDetails.open=false;
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function pageBackground(id){ const map={"task-board":"url('https://wallpapers.com/images/high/nonbinary-6dmq3e06bl8l8zv7.webp')","todays-routine":"url('https://wallpapers.com/images/high/malibu-beach-sunrise-desktop-nmueexjebjnft1wn.webp')","chat-bot-dbt-skills":"url('https://wallpapers.com/images/high/witchy-tarot-cards-for-iphone-screens-onup9yxe4vkuey82.webp')","dbt-daily-cards":"url('https://wallpapers.com/images/high/witchy-tarot-cards-for-iphone-screens-onup9yxe4vkuey82.webp')","dbt-journaling":"url('https://wallpapers.com/images/high/cottagecore-house-artwork-sztao33ct9x0n10r.webp')","mobile-games":"url('https://wallpapers.com/images/high/arctic-orange-sunrise-qmkyi9q7rqsjaccs.webp')","serotonin":"url('https://wallpapers.com/images/high/mystical-tarot-hermit-and-crystals-aesthetic-jpg-f4fqa0odp32jjshv.webp')","squishy-store":"url('https://wallpapers.com/images/high/summer-background-yfcdzb4xyiba2cuy.webp')"}; return map[id]||map["task-board"]; }
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
  function renderAll(){ [["renderCurrency",renderCurrency],["renderTasks",renderTasks],["renderToday",renderToday],["renderCalendar",renderCalendar],["renderActivity",renderActivity],["renderTimeRows",renderTimeRows],["renderDiaryHistory",renderDiaryHistory],["renderJournalHistory",renderJournalHistory],["renderGallery",renderGallery],["renderSerotoninMedia",renderSerotoninMedia],["renderStore",renderStore],["renderCart",renderCart],["renderPurchaseHistory",renderPurchaseHistory],["renderGameSessionStatus",renderGameSessionStatus]].forEach(([name,fn])=>safeStep(name,fn)); }
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
  function renderTimeRows(){ const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]; const host=$("#timeRows"); if(!host) return; host.innerHTML=days.map(d=>{ const row=state.timeRows[d]||{}; const total=calcTime(row.start,row.end); return `<div class="time-row"><strong>${d}</strong><input type="time" data-time-day="${d}" data-time-field="start" value="${row.start||""}"><input type="time" data-time-day="${d}" data-time-field="end" value="${row.end||""}"><span data-time-total="${d}">${minutesLabel(total)}</span></div>`; }).join(""); host.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",e=>{ const {timeDay,timeField}=e.target.dataset; state.timeRows[timeDay] ||= {}; state.timeRows[timeDay][timeField]=e.target.value; const totalEl=e.target.closest(".time-row")?.querySelector("[data-time-total]"); if(totalEl) totalEl.textContent=minutesLabel(calcTime(state.timeRows[timeDay].start,state.timeRows[timeDay].end)); saveState(); renderWeeklyTotal(); })); const notes=$("#timesheetNotes"); if(notes) notes.value=state.timesheetNotes||""; renderWeeklyTotal(); }
  function renderWeeklyTotal(){ const mins=Object.values(state.timeRows||{}).reduce((sum,r)=>sum+calcTime(r.start,r.end),0); const el=$("#weeklyHoursTotal"); if(el) el.textContent=minutesLabel(mins); }
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
function saveMediaConnection(key,urlSel,notesSel){
  state.mediaConnections ||= defaultState().mediaConnections;
  const url=($(urlSel)?.value||"").trim();
  const notes=($(notesSel)?.value||"").trim();
  if(url && !/^https?:\/\//i.test(url)) return toast("Please paste a full https:// link.");
  state.mediaConnections[key]={url,notes,connected:!!url,updatedAt:new Date().toISOString()};
  saveState();
  renderSerotoninMedia();
  toast(`${mediaLabel(key)} connection saved.`);
}
function renderSerotoninMedia(){
  const data={...defaultState().mediaConnections,...(state.mediaConnections||{})};
  const set=(sel,val)=>{ const el=$(sel); if(el && document.activeElement!==el) el.value=val||""; };
  set("#tiktokProfileUrl",data.tiktok.url); set("#tiktokComfortNotes",data.tiktok.notes);
  set("#spotifyUrl",data.spotify.url); set("#spotifyNotes",data.spotify.notes);
  set("#youtubePlaylistUrl",data.youtube.url); set("#youtubeNotes",data.youtube.notes);
  const host=$("#youtubeEmbedHost");
  if(host){
    const embed=youtubeEmbedUrl(data.youtube.url||"");
    host.innerHTML=embed?`<iframe title="Saved YouTube serotonin playlist" src="${escapeAttr(embed)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`:`<p class="soft-note">Paste and save a YouTube playlist URL to preview it here.</p>`;
  }
  renderMediaStatusCards(data);
}
function renderMediaStatusCards(data){
  [["connect-tiktok","tiktok"],["connect-spotify","spotify"],["connect-youtube","youtube"]].forEach(([moduleKey,key])=>{
    const body=$(`.module[data-key="${moduleKey}"] .module-body`);
    if(!body) return;
    let card=body.querySelector(".media-status-card");
    if(!card){ card=document.createElement("div"); card.className="media-status-card"; body.appendChild(card); }
    const row=data[key]||{};
    card.innerHTML=`<strong>${mediaLabel(key)} status:</strong> ${row.connected?"saved link ready":"not connected yet"}${row.updatedAt?`<br><small>Last saved ${new Date(row.updatedAt).toLocaleString()}</small>`:""}`;
  });
}
function mediaLabel(key){ return ({tiktok:"TikTok",spotify:"Spotify",youtube:"YouTube"})[key]||key; }
function youtubeEmbedUrl(value){
  try{
    if(!value) return "";
    const url=new URL(value);
    const list=url.searchParams.get("list");
    const video=url.searchParams.get("v");
    if(list) return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`;
    if(url.hostname.includes("youtu.be") && url.pathname.length>1) return `https://www.youtube.com/embed/${encodeURIComponent(url.pathname.slice(1))}`;
    if(video) return `https://www.youtube.com/embed/${encodeURIComponent(video)}`;
  }catch{}
  return "";
}
function quitActiveGame(reason="quit"){
  const frame=$("#gameFrame");
  if(!frame) return;
  const current=frame.getAttribute("src")||"";
  const selected=$("#gameSelect")?.value||current||state.gameSession?.selectedGame||"";
  if(frame.contentWindow && current && current!=="about:blank"){
    try{ frame.contentWindow.postMessage({type:"jasperGamePauseAndSave",reason,currency:state.currency,totalCopper:currencyToCopper(state.currency),at:new Date().toISOString()},"*"); }catch{}
  }
  state.gameSession={active:false,selectedGame:selected,lastLoadedAt:state.gameSession?.lastLoadedAt||"",lastQuitAt:new Date().toISOString(),saveReason:reason};
  saveState();
  if(current && current!=="about:blank") frame.src="about:blank";
  renderGameSessionStatus();
  toast("Gaming mode saved and quit.");
}
function renderGameSessionStatus(){
  const module=$('.module[data-key="games-module"] .module-body');
  if(!module) return;
  let card=module.querySelector(".game-session-status");
  if(!card){ card=document.createElement("div"); card.className="game-session-status"; module.appendChild(card); }
  const gs=state.gameSession||{};
  const name=gs.selectedGame?prettyGame(gs.selectedGame.replace(/^games\//,"")):"No game loaded yet";
  card.innerHTML=`<strong>Game session:</strong> ${gs.active?"running":"saved / quit"}<br><small>${escapeHtml(name)}${gs.lastQuitAt?` • last quit ${new Date(gs.lastQuitAt).toLocaleString()}`:""}</small>`;
}
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
  function renderChat(){
    const p=personaData();
    const initial=random(p.greetings||["Momma. Lord Onyx Blepman is here: Papa’s best friend, Momma’s devoted baby, and tiny void emperor of DBT, ADHD, grounding, self-care resets, diary cards, and reward check-ins."]);
    if(!state.chat.length) state.chat=[{role:"bot",text:initial,mood:"caring"}];
    const html=state.chat.map(m=>messageHtml(m)).join("");
    const main=$("#chatMessages"); if(main) main.innerHTML=html;
    const floating=$("#floatingChatMessages"); if(floating) floating.innerHTML=state.chat.slice(-8).map(m=>messageHtml(m)).join("");
    scrollChats();
  }
  function sendChat(input, target){
    const text=(input?.value||"").trim();
    if(!text) return;
    if(target==="#floatingChatMessages") openFloatingBot();
    state.chat.push({role:"user",text});
    const scanReport=runPassiveScanner(text);
    const result=supportAnswer(text, scanReport);
    setSupportMood(result.mood||"caring");
    setFloatingButtonMood(result.mood||"caring");
    state.chat.push({role:"bot",text:result.text,mood:result.mood||"caring"});
    const q=text.toLowerCase();
    if(isCrisisTrigger(q)||q.includes("panic")||q.includes("overwhelmed")||q.includes("crisis")||q.includes("distress")) tryAutoCompleteTask("use-chatbot-distress","Used support chat during distress");
    else tryAutoCompleteTask("use-chatbot","Used support chat for a check-in");
    input.value="";
    saveState();
    renderAll();
    renderChat();
  }
  function addBotMessage(text,mood="caring"){
    state.chat.push({role:"bot",text,mood});
    setSupportMood(mood); setFloatingButtonMood(mood);
    saveState(); renderChat();
  }
  function runPassiveScanner(text){
    let report=null;
    try{
      const runtime=window.UnifiedPsychiatryBackgroundScanner;
      if(runtime && typeof runtime.scanText==="function") report=runtime.scanText(text,{threshold:45,focus:"both",mode:"support"});
    }catch(err){ report=null; }
    if(report){
      state.scannerReports ||= [];
      state.scannerReports.unshift({createdAt:report.createdAt||new Date().toISOString(), risk_level:report.risk_level||"routine", prompt_context:report.prompt_context||report.prompt||"", layers:report.layers||{}, signals:report.signals||[]});
      state.scannerReports=state.scannerReports.slice(0,25);
      const status=$("#backgroundScannerStatus");
      if(status){ status.textContent=`Passive scanner: ${report.risk_level||"routine"}`; status.dataset.risk=report.risk_level||"routine"; }
    }
    return report;
  }
  function scannerGuidance(report){
    if(!report) return "";
    const risk=report.risk_level||"routine";
    const layers=report.layers||{};
    const found=[];
    ["primary","secondary","tertiary"].forEach(key=>{ (layers[key]||[]).slice(0,2).forEach(x=>found.push(x.label||x.key||key)); });
    const line=found.length ? `

Background scanner noticed: ${found.slice(0,4).join(", ")}.` : "";
    if(risk==="critical") return line;
    if(risk==="high"||risk==="elevated") return `${line}

Because this looks heavier than a normal check-in, I am going to keep the next step small, concrete, and body-safe.`;
    return line;
  }
  function messageHtml(m){
    const mood=m.mood ? canonicalMoodKey(m.mood) : "";
    const label=mood ? ((moodMeta(mood)||{}).label || mood) : "";
    const moodTag=mood?`<span class="mood-tag">${escapeHtml(label)}</span>`:"";
    const speaker=m.role==="bot"?"Onyx":"You";
    return `<div class="message ${m.role}"><span class="message-speaker">${speaker}${m.role==="bot"?moodTag:""}</span>${escapeHtml(m.text).replace(/\n/g,"<br>")}</div>`;
  }
  function normalizeText(value){ return String(value||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[“”]/g,'"'); }
  function includesAny(text, list=[]){ const q=normalizeText(text); return (list||[]).some(item=>q.includes(normalizeText(item))); }
  function pick(list, fallback=""){ return Array.isArray(list)&&list.length ? list[Math.floor(Math.random()*list.length)] : fallback; }
  function onyxData(){ return window.EMPEROR_ONYX_PERSONALITY_DATA || window.ONYX_PERSONALITY_REFERENCE || {}; }
  function supportData(){
    const onyx=onyxData();
    return onyx.supportSkills || (window.JASPER_SUPPORT_DATA||{}).supportSkills || (window.JASPER_SUPPORT_DATA||{});
  }
  function personaData(){
    const p=onyxData().persona || {};
    return Object.keys(p).length ? p : {
      identity:"Lord Onyx Blepman is Papa’s best friend, Momma’s devoted baby, and the tiny void emperor of DBT, ADHD, grounding, and self-care support.",
      greetings:["Momma. Onyx is here. Tell me the messy version and we will make it smaller."],
      careLines:["Care comes before shame."], dbtLines:["DBT is a tool, not a punishment."], adhdLines:["Starting gets rewarded before finishing."],
      crisisLines:["This is bigger than cozy chat, and you deserve live human help now."], idleLines:["Quiet counts. Rest counts. Pausing before reacting counts."],
      comfortLines:["You do not have to solve everything at once."], pepTalkLines:["Do the next gentle thing. Not the perfect thing."], signoffs:["Tiny wins are real wins."]
    };
  }
  function intentData(){ return onyxData().chatIntents || supportData().chatIntents || {}; }
  function moodMeta(key){
    const moods=(onyxData().moods || SUPPORT_MOODS || {});
    let mood=moods[key] || moods[canonicalMoodKey(key)] || moods.caring || SUPPORT_MOODS.caring || {};
    if(mood.aliasFor) mood=moods[mood.aliasFor] || mood;
    return mood;
  }
  function linePool(poolName, fallback=[]){
    const p=personaData();
    const expanded=onyxData().dialogueExpansion || {};
    const pool=p[poolName] || expanded[poolName] || [];
    return Array.isArray(pool) && pool.length ? pool : fallback;
  }
  function pickLineForMood(moodKey, fallback=""){
    const mood=canonicalMoodKey(moodKey);
    const meta=moodMeta(mood);
    const poolName=meta.linePool || ({caring:"caringLines",listening:"listeningLines",snuggly:"snugglyLines",purring:"purringLines",thinking:"thinkingLines",thoughtful:"thoughtfulLines",advising_professor:"advisorLines",judgmental:"judgmentalLines",sleepy:"sleepyLines",hungry:"hungryLines"})[mood] || "careLines";
    return pick(linePool(poolName, personaData().careLines || []), fallback || meta.note || "Onyx is here.");
  }
  function isCrisisTrigger(input){
    const support=supportData();
    const crisis=support.crisisTriggers||["kill myself","suicide","suicidal","end it all","hurt myself","harm myself","self harm","self-harm","overdose","can't stay safe","cannot stay safe","not safe","danger to myself","hurt someone","harm someone"];
    return includesAny(input,crisis);
  }
  function isJudgmentalTrigger(input){
    const text=normalizeText(input);
    const patterns=[/\b(haven't|have not|didn't|did not|forgot to|skipped|missed)\s+(eat|eaten|food|meal|meds|medication|medicine|pills|bathe|shower|wash|hydrate|water)\b/,/\b(had|have)\s+(no|zero)\s+(food|meal|water|drink|hydration)\b/];
    return patterns.some(rx=>rx.test(text));
  }
  function canonicalMoodKey(key){
    if(!key) return "caring";
    key=String(key).replace(/-/g,"_").toLowerCase();
    if(key==="advising"||key==="advisor"||key==="professor") return "advising_professor";
    if(key==="grounding") return "purring";
    if(key==="judgemental") return "judgmental";
    const moods=onyxData().moods || SUPPORT_MOODS || {};
    return moods[key] ? key : "caring";
  }
  function moodLine(moodKey, fallback=""){
    return pickLineForMood(moodKey, fallback || "Onyx is here with one tiny paw-step.");
  }
  function findDbtSkill(input){
    const skills=supportData().dbtSkills||{};
    const text=normalizeText(input);
    let first=null;
    if(/\btipp\b|panic|panicking|body alarm|dysregulated|meltdown|shutdown|overwhelmed/.test(text)&&skills.tipp) return {key:"tipp",skill:skills.tipp};
    if(/\bstop\b|urge|impulse|lash out|react|send a text/.test(text)&&skills.stop) return {key:"stop",skill:skills.stop};
    if(/boundary|ask for|say no|request/.test(text)&&skills.dear_man) return {key:"dear_man",skill:skills.dear_man};
    if(/shame|lazy|failure|worthless/.test(text)&&skills.nonjudgmental_stance) return {key:"nonjudgmental_stance",skill:skills.nonjudgmental_stance};
    for(const [key,skill] of Object.entries(skills)){ if(!first) first={key,skill}; if(includesAny(text,skill.triggers||[])) return {key,skill}; }
    return (text.includes("dbt")||text.includes("skill"))?first:null;
  }
  function findAdhdTool(input){
    const tools=supportData().adhdTools||{};
    const text=normalizeText(input);
    let first=null;
    for(const [key,tool] of Object.entries(tools)){ if(!first) first={key,tool}; if(includesAny(text,tool.triggers||[])) return {key,tool}; }
    if(/can't start|cannot start|stuck|task paralysis|executive dysfunction|overwhelming task/.test(text)&&tools.tiny_task_splitter) return {key:"tiny_task_splitter",tool:tools.tiny_task_splitter};
    if(/body double|sit with me|stay with me/.test(text)&&tools.body_double) return {key:"body_double",tool:tools.body_double};
    return text.includes("adhd")?first:null;
  }
  function formatSteps(steps){ return (steps||[]).map((step,i)=>`${i+1}. ${step}`).join("\n"); }
  function buildDbtResponse(input){
    const p=personaData();
    const found=findDbtSkill(input)||findDbtSkill("wise mind")||findDbtSkill("dbt");
    if(!found) return {mood:"advising_professor",text:`${pick(p.dbtLines,moodLine("advising_professor"))}\n\nDBT helper mode is installed. Tell me the emotion, urge, relationship problem, or stuck point, and I will pick a skill.`};
    const skill=found.skill;
    const mood=canonicalMoodKey(skill.mood||"advising_professor");
    return {mood,text:`${pick(p.dbtLines,moodLine(mood))}\n\nSkill: ${skill.title||found.key}\nUse when: ${skill.useWhen||"the feelings are loud and you need a practiced next step"}\n\nTiny-step practice:\n${formatSteps(skill.steps||skill.practice||[])}\n\nTiny first step: ${skill.tinyStep||"Name the feeling, lower the demand, and choose the smallest safe action."}\n\nNot a verdict. Not a punishment. Skill practice is how we help Future Jasper.`};
  }
  function buildAdhdResponse(input){
    const p=personaData();
    const found=findAdhdTool(input)||findAdhdTool("tiny task splitter")||findAdhdTool("adhd");
    if(!found) return {mood:"advising_professor",text:`${pick(p.adhdLines,moodLine("advising_professor"))}\n\nADHD helper mode is installed. Give me the stuck task and I will chop it into tiny rewardable pieces.`};
    const tool=found.tool;
    const mood=canonicalMoodKey(tool.mood||"advising_professor");
    const template=(tool.template||[]).length?`\n\nFill-in helper:\n${(tool.template||[]).map(line=>`- ${line}`).join("\n")}`:"";
    return {mood,text:`${pick(p.adhdLines,moodLine(mood))}\n\nTool: ${tool.title||found.key}\nUse when: ${tool.useWhen||"the task will not start because the brain is doing seventeen tabs at once"}\n\nTiny rewardable steps:\n${formatSteps(tool.steps||[])}${template}\n\nRule: starting gets rewarded before finishing. Tiny steps count.`};
  }
  function buildSelfCareReset(){
    return {mood:"caring",text:`${moodLine("caring")}\n\nSelf-care reset, not self-care sentencing:\n1. Food: something counts, even small.\n2. Water/electrolytes: a few sips is a valid start.\n3. Meds: only as prescribed; this support tool does not change medication instructions.\n4. Hygiene: wipe face, brush teeth, bath/shower, deodorant, clean clothes, or the smallest available version.\n5. Body check: bathroom, pain, temperature, position, rest.\n6. Environment: one visible reset, one piece of trash, one dish, or one blanket adjustment.\n\nTiny first step: pick the easiest body need and do the smallest possible version.`};
  }
  function buildDiaryCardResponse(){
    const card=supportData().diaryCardTemplate||{};
    const fields=(card.fields||["Emotion", "Distress 0–10", "Body needs", "Skill used", "Tiny win"]).map(field=>`- ${field}`).join("\n");
    return {mood:"listening",text:`${moodLine("listening")}\n\n${card.title||"DBT Daily Diary Card"}\n${fields}\n\nAnswer one line if that is all the day has room for. Partial check-ins are real care.`};
  }
  function buildAttachmentBpdResponse(input){
    const profiles=supportData().attachmentBpdSupport?.profiles||{};
    const text=normalizeText(input);
    let key="underlying_reactive_attachment_alarm";
    if(text.includes("quiet")||text.includes("discouraged")||text.includes("worthless")||text.includes("lonely")) key="discouraged_quiet_bpd";
    if(text.includes("petulant")||text.includes("anger")||text.includes("control")||text.includes("possessive")) key="petulant_bpd";
    if(text.includes("self-destructive")||text.includes("self destructive")||text.includes("self harm")||text.includes("self-hate")||text.includes("risky")) key="self_destructive_bpd";
    const profile=profiles[key]||profiles.underlying_reactive_attachment_alarm||{};
    const plan=profile.plan||profile.steps||[];
    const safety=key==="self_destructive_bpd"?"\n\nSafety clause: if urges feel unsafe or you cannot stay safe, this needs live human help now — emergency services, crisis support, or a trusted nearby person.":"";
    return {mood:key==="petulant_bpd"?"thoughtful":"caring",text:`${moodLine(key==="petulant_bpd"?"thoughtful":"caring")}\n\nPattern support: ${profile.label||"Attachment/BPD alarm support"}\nThis is skills support, not a diagnosis or replacement for therapy.\n\nWhen it shows up:\n${formatSteps(profile.whenItShowsUp||[])}\n\nTiny-step plan:\n${formatSteps(plan)}${safety}\n\nTiny first step: “This is an alarm, not a verdict.” Then choose STOP, TIPP, Check the Facts, DEAR MAN, or one safe connection bid.`};
  }
  function buildCrisisResponse(scanReport=null){
    const safety=supportData().clinicalSafety||{};
    const noticed=scannerGuidance(scanReport);
    return {mood:"caring",text:`${pick(linePool("crisisLines", personaData().crisisLines||[]),"Momma, this is bigger than cozy chat, and Onyx wants live human help involved now.")}${noticed}

${safety.crisisMessage||"If there is immediate danger, or you might hurt yourself or someone else, contact local emergency services or a trusted nearby person now."}

Tiny safety bridge right now:
1. Move away from anything you could use to hurt yourself if you can.
2. Message or call one real person nearby: “I am not safe alone and need you now.”
3. Use emergency services or a crisis line if danger is immediate or you cannot stay safe.

Onyx can stay open for grounding while you connect to real help, but he cannot be the only safety plan. Momma deserves live support.`};
  }
  function buildWho(){
    const p=personaData();
    const dbtTitles=Object.values(supportData().dbtSkills||{}).slice(0,16).map(skill=>skill.title).join(", ");
    const adhdTitles=Object.values(supportData().adhdTools||{}).map(tool=>tool.title).join(", ");
    const canon=onyxData().onyxRelationshipCanon?.summary || p.relationship || "Onyx is Papa’s best friend and Momma’s devoted baby. He sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow.";
    return `${p.identity||"Lord Onyx Blepman, Emperor Of The Voidattude, is the black-cat heart of this helper bot."}

${canon}

Onyx is now the main Squishy support voice, not a separate generic chatbot. He handles DBT, ADHD tiny steps, grounding, attachment alarms, diary cards, self-care resets, reward support, mobile-game regulation support, and passive background scanner context.

DBT helper skills include: ${dbtTitles||"STOP, TIPP, Wise Mind, Check the Facts, Opposite Action, PLEASE, DEAR MAN/GIVE/FAST"}.

ADHD helper tools include: ${adhdTitles||"tiny task splitter, body doubling, reminders, transitions, and shame-free resets"}.

Safety boundary: Onyx can coach skills, grounding, routines, and self-care check-ins, but he is not licensed therapy, medical care, or emergency care.`;
  }
  function comfortMoodFor(text){ const t=normalizeText(text); if(/panic|anxious|spiral|dysregulated|ground|breathe/.test(t)) return "purring"; if(/cry|sad|hurt|fragile|scared/.test(t)) return "caring"; if(/vent|listen|rant|talk/.test(t)) return "listening"; if(/alone|lonely|hold|cuddle|snuggle|safe/.test(t)) return "snuggly"; return "caring"; }
  function supportAnswer(text, scanReport=null){
    const q=normalizeText(text), p=personaData();
    const hasIntent=name=>includesAny(q,(intentData())[name]||[]);
    if(isCrisisTrigger(q) || scanReport?.risk_level==="critical") return buildCrisisResponse(scanReport);
    if(q.includes("idle")) return {mood:"sleepy",text:`${pick(p.idleLines,"Quiet counts. Rest counts. Pausing before reacting counts.")}\n\n${moodLine("sleepy")}`};
    if(isJudgmentalTrigger(q)) return {mood:"judgmental",text:`${moodLine("judgmental")}\n\nCare-check mode is only for skipped body care. Tiny step now: food, meds-as-prescribed, bathing/hygiene, hydration, rest, or a safer position — whichever applies. No shame.`};
    if(hasIntent("attachment")||hasIntent("attachment_bpd_support")||q.includes("attachment")||q.includes("abandonment")||q.includes("bpd")||q.includes("borderline")) return buildAttachmentBpdResponse(q);
    if(q.includes("diary")||q.includes("diary_card")) return buildDiaryCardResponse();
    if(q.includes("tipp")) return buildDbtResponse("tipp panic body alarm");
    if(hasIntent("dbt")||q.includes("dbt")||q.includes("skill")||q.includes("wise mind")||findDbtSkill(q)) return buildDbtResponse(q);
    if(hasIntent("adhd")||q.includes("adhd")||q.includes("stuck")||q.includes("task")||q.includes("body double")||findAdhdTool(q)) return buildAdhdResponse(q);
    if(q.includes("self_care_reset")||q.includes("self-care reset")||q.includes("body check")||q.includes("reset")) return buildSelfCareReset();
    if(q.includes("reward")||q.includes("currency")||q.includes("copper")||q.includes("silver")||q.includes("gold")||q.includes("platinum")) return {mood:"advising_professor",text:`${moodLine("advising_professor")}\n\nJasper’s reward system is active: 10 copper = 1 silver, 10 silver = 1 gold, and 10 gold = 1 platinum. Tiny steps count. Starting counts. Asking for help counts.`};
    if(q.includes("game")) return {mood:"purring",text:`${moodLine("purring")}\n\nMobile game decompression mode is installed. Jasper currency is the reward that matters now: launching, playing, in-game wins, and stopping before overstimulation all count through the game bridge.`};
    if(hasIntent("who")||q.includes("who are you")) return {mood:"advising_professor",text:buildWho()};
    if(hasIntent("love")||q.includes("thank")||q.includes("win")||q.includes("done")) return {mood:"purring",text:`${pick(p.signoffs,"Tiny wins are real wins.")} ${pick(["Good job, Jasper. Let the win count.","Progress acknowledged. Care can stay small and doable.","Tiny wins are real wins."],"Tiny wins are real wins.")}`};
    if(hasIntent("snack")||q.includes("hungry")||q.includes("food")) return {mood:"hungry",text:`${moodLine("hungry","The Victorian wet-food soprano has entered the chat.")}

Food check for Momma/Jasper: please get a tiny safe food or drink if your body needs one. Eating counts even when it is simple. Onyx also notes that snack tribute remains morally important.`};
    if(hasIntent("comfort")||q.includes("comfort")) { const mood=comfortMoodFor(q); return {mood,text:`${moodLine(mood)}\n\n${pick(p.comfortLines,"You do not have to solve everything at once.")}\n\nWant a skill? Ask for DBT picker, TIPP, diary card, or ADHD tiny steps.`}; }
    if(hasIntent("pep")||q.includes("pep")) return {mood:"thinking",text:`${moodLine("thinking")}\n\n${pick(p.pepTalkLines,"Do the next gentle thing. Not the perfect thing. The next gentle thing.")}\n\n${pick(p.adhdLines,"Start tiny.")}`};
    if(q.includes("snuggly")||q.includes("cuddle")||q.includes("soft")) return {mood:"snuggly",text:`${moodLine("snuggly")}\n\nRest is approved. Low-demand recovery counts.`};
    if(q.includes("purr")||q.includes("breathe")||q.includes("ground")) return {mood:"purring",text:`${moodLine("purring")}\n\nTry one slow breath: in, out. Good. If panic is loud, ask for TIPP.`};
    if(q.includes("listen")||q.includes("vent")||q.includes("rant")) return {mood:"listening",text:`${moodLine("listening")}\n\nI will not rush you. Tell me one piece at a time. If you want help after, I can pick a DBT skill or an ADHD tiny step.`};
    const mood=comfortMoodFor(q)||"caring";
    return {mood,text:`${moodLine(mood)}\n\n${pick(["I reviewed your message.","Let’s put one steady hand on the problem.","Your emotional paperwork has been accepted.","I can help you make this smaller."],"I can help.")} ${pick(["Start with the smallest next step, then check back in.","Do not bully yourself. Care works better than shame.","Drink water, adjust your body if needed, and let the next thing be gentle.","Your feelings are information, not a courtroom verdict.","Make the plan smaller until it stops hissing at you."],"Tiny step first.")}\n\n${pick(p.signoffs,"One step counts.")}`};
  }
  function supportReply(text){ return supportAnswer(text).text; }
  function quickSupportInputFor(key){
    return ({comfort:"I need comfort.",pep:"Give me a pep talk.",who:"Who are you and what support can you do?",idle:"idle",caring:"Please reassure me.",listening:"Listening mode. I need to vent.",grounding:"Help me breathe and ground.",advising:"I need advice and tiny steps.",advising_professor:"I need advice and tiny steps.",thinking:"Think through this with me.",thoughtful:"Be thoughtful and kind-truth this.",judgmental:"I skipped care. Help me choose the next body-care step.",sleepy:"Rest mode.",dbt:"Choose a DBT skill for me.",dbt_picker:"Choose a DBT skill for me.",tipp:"I am panicking and need TIPP.",diary_card:"Help me fill out a DBT diary card.",adhd_split:"ADHD task splitter please. Break this down into tiny steps.",body_double:"Body double mode. Sit with me while I start.",self_care_reset:"Self-care reset. Help me check food, water, meds, hygiene, pain, and rest.",rewards:"Explain Jasper currency rewards.",mobile_games:"Open the mobile games reward mode.",attachment_alarm:"I am having an attachment alarm and fear of abandonment.",quiet_bpd:"Quiet BPD feelings are loud and I feel worthless and lonely.",petulant_bpd:"Petulant BPD anger/control urges are loud. Help me pause.",self_destructive_bpd:"Self-destructive BPD urges are loud. Help me choose safety."})[key]||`Explain ${String(key).replace(/_/g," ")} DBT skill.`;
  }
  function setSupportMood(key){
    const canonical=canonicalMoodKey(key);
    const mood=moodMeta(canonical)||{};
    const label=$("#supportMoodLabel"), note=$("#supportMoodNote"), img=$("#supportMoodImage");
    if(label) label.textContent=mood.label ? `Onyx: ${mood.label}` : "Onyx support";
    if(note) note.textContent=mood.note || "Onyx is ready with tiny paw-step support.";
    if(img && mood.image){ img.src=mood.image; img.alt=`Onyx mood: ${mood.label||canonical}`; }
    const titleImg=$(".floating-support-title img");
    if(titleImg && mood.image){ titleImg.src=mood.image; titleImg.alt=""; }
    document.body.dataset.supportMood=canonical;
  }
  function setFloatingButtonMood(key){
    const canonical=canonicalMoodKey(key);
    const mood=moodMeta(canonical)||{};
    const btn=$("#floatingBotButton");
    if(btn) btn.setAttribute("aria-label", `Open Onyx quick support: ${mood.label||canonical}`);
    const icon=$("#floatingBotButtonIcon");
    if(icon && mood.image){ icon.innerHTML=`<img src="${escapeAttr(mood.image)}" alt="" />`; }
  }
  function openFloatingBot(){ const bot=$("#floatingBot"); if(bot) bot.classList.add("open"); $("#floatingBotButton")?.classList.add("awake"); setSupportMood("listening"); setFloatingButtonMood("listening"); }
  function closeFloatingBot(){ $("#floatingBot")?.classList.remove("open"); $("#floatingBotButton")?.classList.remove("awake"); setFloatingButtonMood("caring"); }
  function renderDbt(){
    const q=($("#dbtSearch")?.value||"").toLowerCase();
    const supportSkills=Object.entries(supportData().dbtSkills||{}).map(([key,skill])=>({title:skill.title||key,module:skill.module||"DBT",desc:skill.useWhen||skill.tinyStep||"DBT skill support",key,source:"support"}));
    const combined=[...supportSkills,...DBT_SKILLS];
    const seen=new Set();
    const filtered=combined.filter(s=>{ const id=(s.title||"").toLowerCase(); if(seen.has(id)) return false; seen.add(id); return !q||JSON.stringify(s).toLowerCase().includes(q); });
    const target=$("#dbtResults"); if(target) target.innerHTML=filtered.map(s=>`<article class="dbt-card"><h4>${escapeHtml(s.title)}</h4><strong>${escapeHtml(s.module||"DBT")}</strong><p>${escapeHtml(s.desc||"")}</p><button class="complete-button" type="button" data-complete="dbt-skill">Log DBT skill</button><button class="ghost-button" type="button" data-support="${escapeHtml(s.key||s.title)}">Ask helper</button></article>`).join("")||`<p class="soft-note">No DBT skills match that search.</p>`;
  }
  function renderSupportResources(){
    const support=supportData();
    const dbt=Object.values(support.dbtSkills||{}).slice(0,24).map(s=>s.title||"").filter(Boolean);
    const adhd=Object.values(support.adhdTools||{}).map(s=>s.title||"").filter(Boolean);
    const chips=(items,limit=30)=>(items||[]).slice(0,limit).map(x=>`<span class="lore-chip">${escapeHtml(x)}</span>`).join("");
    const el=$("#supportResources"); if(!el) return;
    el.innerHTML=`<article><h3>Onyx support systems merged</h3><p>Lord Onyx Blepman is the primary voice for DBT, ADHD, attachment-alarm, diary-card, rewards, mobile-game regulation support, and passive background scanner context. He is Papa’s best friend, Momma’s devoted baby, and the tiny void emperor of shame-free care.</p></article><article><h4>DBT skills Onyx can coach</h4><p class="lore-chip-row">${chips(dbt,24)}</p></article><article><h4>ADHD tools Onyx can coach</h4><p class="lore-chip-row">${chips(adhd,18)}</p></article><article><h4>Safety note</h4><p>${escapeHtml(support.clinicalSafety?.shortDisclaimer||"Onyx can coach skills, grounding, routines, and self-care check-ins, but he is not licensed therapy, medical care, or emergency care.")}</p></article>`;
  }

  const MODULE_BUBBLE_EMOJIS = {
    "task-overview":"🏡", "calendar-views":"📅", "task-library":"📋", "custom-task":"➕", "activity-log-module":"📝", "today-list":"☀️", "caregiver-workday":"🤝", "timesheet-style":"⏰", "support-chat":"💬", "dbt-search":"🧠", "diary-card":"📓", "journal-module":"📔", "gallery-module":"🖼️", "connect-tiktok":"🎵", "connect-spotify":"🎧", "connect-youtube":"▶️", "support-resources":"🧠", "games-module":"🎮", "game-launcher":"🎮", "store-shelf":"🛒", "cart":"🧺", "custom-store":"🔗"
  };
  function refreshModuleBubbleLabels(){ $$(".module").forEach(m=>{ const title=m.querySelector(".module-title"); if(!title) return; if(!title.dataset.fullTitle) title.dataset.fullTitle=title.textContent; const emoji=MODULE_BUBBLE_EMOJIS[m.dataset.key]||"✨"; if(m.classList.contains("minimized")) title.textContent=`${emoji}\n${title.dataset.fullTitle}`; else title.textContent=title.dataset.fullTitle; }); }
  function setupDraggables(){ restoreLayout(); $$(".draggable,.movable").forEach(el=>{ const handle=el.querySelector(".drag-handle")||el; let startX=0,startY=0,baseX=0,baseY=0,drag=false; handle.addEventListener("pointerdown",e=>{ if(e.target.closest("button,a,input,select,textarea,summary")) return; drag=true; startX=e.clientX; startY=e.clientY; baseX=parseFloat(el.dataset.x||0); baseY=parseFloat(el.dataset.y||0); handle.setPointerCapture?.(e.pointerId); }); handle.addEventListener("pointermove",e=>{ if(!drag) return; const x=baseX+e.clientX-startX,y=baseY+e.clientY-startY; el.dataset.x=x; el.dataset.y=y; el.style.transform=`translate3d(${x}px,${y}px,0)`; }); handle.addEventListener("pointerup",()=>{ if(drag){ drag=false; saveLayout(); }}); }); }
  function saveLayout(){ state.layout={}; $$(".draggable,.movable").forEach(el=>{ const key=el.id||el.dataset.key; if(key) state.layout[key]={x:el.dataset.x||0,y:el.dataset.y||0,minimized:el.classList.contains("minimized")}; }); saveState(); }
  function restoreLayout(){ const layout=state.layout||{}; $$(".draggable,.movable").forEach(el=>{ const key=el.id||el.dataset.key; const pos=layout[key]; if(pos){ el.dataset.x=pos.x||0; el.dataset.y=pos.y||0; el.style.transform=`translate3d(${pos.x||0}px,${pos.y||0}px,0)`; el.classList.toggle("minimized",!!pos.minimized); refreshModuleBubbleLabels(); } }); }
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
  function toast(message){ const host=$("#toastHost"); if(!host){ console.log("[JCC toast]", message); return; } const el=document.createElement("div"); el.className="toast"; el.textContent=message; host.appendChild(el); setTimeout(()=>{el.style.opacity="0";el.style.transform="translateY(8px)"},3500); setTimeout(()=>el.remove(),4300); }
})();
