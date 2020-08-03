import 'core-js/stable';
import 'regenerator-runtime/runtime';
import Vue from "vue";

import App from "./App.vue";

const app = new Vue({
    render: (h) => h(App),
}).$mount("#app");

(window as any).app = app;

// First we get the viewport height and we multiple it by 1% to get a value for a vh unit
let currentVh = document.documentElement.clientHeight * 0.01;
// Then we set the value in the --vh custom property to the root of the document
document.documentElement.style.setProperty("--vh", `${currentVh}px`);

const w = window as any;
if (w.visualViewport) {
    let pendingUpdate = false;
    const viewportHandler = (event) => {
        if (pendingUpdate) return;
        pendingUpdate = true;

        requestAnimationFrame(() => {
            pendingUpdate = false;
            const viewport = event.target;
            const height = viewport.height;

            // We execute the same script as before
            const vh = height * 0.01;

            if (vh == currentVh) {
                return;
            }
            currentVh = vh;
            document.documentElement.style.setProperty("--vh", `${vh}px`);
        });
    };
    //w.visualViewport.addEventListener('scroll', viewportHandler);
    w.visualViewport.addEventListener('resize', viewportHandler);
} else {
    // We listen to the resize event
    window.addEventListener(
        "resize",
        () => {
            // We execute the same script as before
            const vh = document.documentElement.clientHeight * 0.01;
            if (vh == currentVh) {
                return;
            }
            currentVh = vh;
            document.documentElement.style.setProperty("--vh", `${vh}px`);
        },
        { passive: true } as EventListenerOptions
    );

    // We listen to the resize event
    window.addEventListener(
        "focus",
        () => {
            // We execute the same script as before
            const vh = document.documentElement.clientHeight * 0.01;

            if (vh == currentVh) {
                return;
            }
            currentVh = vh;
            document.documentElement.style.setProperty("--vh", `${vh}px`);
        },
        { passive: true } as EventListenerOptions
    );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
document.body.addEventListener("touchstart", () => { }, { passive: true });

// Load plausible if not production
if (process.env.NODE_ENV == "production") {
    var script = document.createElement('script');
    script.onload = function () {
        //do stuff with the script
        console.log("Plausible loaded")
    };
    script.setAttribute("data-domain", "stamhoofd.app");
    script.src = "https://plausible.io/js/plausible.js";
    document.head.appendChild(script); //or something of the likes
}