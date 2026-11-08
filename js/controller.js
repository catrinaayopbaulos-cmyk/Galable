
import { state } from "./model.js";
import View from "./views/View.js";

const view = new View();

function init() {
  console.log("Ambagala is starting...");
  console.log("Project data:", state);

  view.render("Ambagala MVC initialized successfully!");
}

init();
