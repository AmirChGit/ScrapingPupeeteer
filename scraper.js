const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");

async function searchGoogleMaps() {
  try {
    const start = Date.now();

    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: false,
      executablePath: "", // Add your path here
    });

    const page = await browser.newPage();

    const query = "restaurants à proximité de Lille-Centre, Lille";

    try {
      // Accept terms and conditions
      await page.goto("https://www.google.com/maps", { waitUntil: "domcontentloaded" });
      await page.waitForSelector('button[aria-label="Tout accepter"]', { visible: true });
      await page.click('button[aria-label="Tout accepter"]');
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // Navigate to the search page
      await page.goto(`https://www.google.com/maps/search/${query.split(" ").join("+")}`, { waitUntil: "domcontentloaded" });
    } catch (error) {
      console.log("Error navigating to page:", error.message);
    }

    async function autoScroll(page) {
      await page.evaluate(async () => {
        const wrapper = document.querySelector('div[role="feed"]');

        await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 1000;
          var scrollDelay = 3000;

          var timer = setInterval(async () => {
            var scrollHeightBefore = wrapper.scrollHeight;
            wrapper.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeightBefore) {
              totalHeight = 0;
              await new Promise((resolve) => setTimeout(resolve, scrollDelay));

              // Calculate scrollHeight after waiting
              var scrollHeightAfter = wrapper.scrollHeight;

              if (scrollHeightAfter > scrollHeightBefore) {
                // More content loaded, keep scrolling
                return;
              } else {
                // No more content loaded, stop scrolling
                clearInterval(timer);
                resolve();
              }
            }
          }, 200);
        });
      });
    } 

    await autoScroll(page);

    // Extract links to the individual restaurant pages
    const html = await page.content();
    const $ = cheerio.load(html);
    const restaurantLinks = [];

    $('a[href*="/maps/place/"]').each((i, el) => {
      const href = $(el).attr("href");
      if (href) {
        restaurantLinks.push(href);
      }
    });

    console.log("Number of restaurant links:", restaurantLinks.length);
    console.log("Restaurant Links:", restaurantLinks);

    // Process each link individually
    for (let i = 0; i < restaurantLinks.length; i++) {
      await processRestaurantLink(browser, restaurantLinks[i]);
    }

    const end = Date.now();
    console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);

    await browser.close();
    console.log("Browser closed");
  } catch (error) {
    console.log("Error at googleMaps", error.message);
  }
}

async function processRestaurantLink(browser, link) {
  const page = await browser.newPage();

  try {
    await page.goto(link, { waitUntil: "domcontentloaded" });

    // Extract information from the expanded view
    const websiteElement = await page.$('a[data-item-id="authority"]');
    if (websiteElement) {
      const website = await websiteElement.evaluate(element => element.getAttribute('href'));
      console.log("Website:", website);
    }

    // Add more code to extract other information as needed
  } catch (error) {
    console.log("Error processing restaurant link:", error.message);
  } finally {
    await page.close();
  }
}

searchGoogleMaps();
