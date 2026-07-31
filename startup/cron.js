const goviShopDao = require("../dao/govi-shop-dao");

function startCronJobs() {
  console.log("⏰ Starting background cron jobs...");

  // Start background interval for GoviShop cart cleanup (runs every 10 minutes)
  setInterval(async () => {
    console.log("⏰ Starting cron jobs...");
    try {
      const result = await goviShopDao.cleanExpiredCarts();
      console.log(
        `[Cleanup] GoviShop cleanup: Released ${result.releasedCount} allocations, deleted ${result.deletedItemsCount} expired items.`
      );
    } catch (err) {
      console.error("[Cleanup] GoviShop cart cleanup error:", err);
    }
  }, 10 * 60 * 1000);
}

module.exports = {
  startCronJobs,
};
