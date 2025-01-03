
import MainPage from "./view/index";

window._mainPage = new MainPage();


if ("serviceWorker" in navigator) {

    try {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
                registration.unregister()
            }
        });
        navigator.serviceWorker.register(new URL('../service-worker.js', import.meta.url, {
            scope: '/'
        }));
        console.log('Service Worker Registered');
    } catch (error) {
        console.log('Service Worker Register Failed');
    }
}