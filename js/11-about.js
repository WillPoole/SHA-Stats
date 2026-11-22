"use strict";

const slug = t => fold(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let renderAbout;
