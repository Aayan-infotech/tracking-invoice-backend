import { loadConfig } from "./src/config/loadConfig.js";
const { default: connectDB } = await import("./src/db/index.js");
const { app } = await import("./src/app.js");

const secret = await loadConfig();

connectDB()
  .then(() => {
    app.listen(secret.PORT || 3333, () => {
      console.log(`Server started on port ${secret.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Mongo DB connection failed!!! ${err}`);
  });

