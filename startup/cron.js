const goviShopDao = require("../dao/govi-shop-dao");

function startCronJobs() {
  console.log("⏰ Starting background cron jobs...");

  // Start background interval for GoviShop cart cleanup (runs once every 24 hours / 1 day)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log("⏰ Starting daily cron jobs...");
    try {
      const result = await goviShopDao.cleanExpiredCarts();
      console.log(
        `[Cleanup] GoviShop cleanup: Released ${result.releasedCount} allocations, deleted ${result.deletedItemsCount} expired items.`
      );
    } catch (err) {
      console.error("[Cleanup] GoviShop cart cleanup error:", err);
    }
  }, ONE_DAY_MS);
}

module.exports = {
  startCronJobs,
};
