// "undefined" means the URL will be computed from the `window.location` object
export const URL = process.env.NODE_ENV === 'production' ? '/home' : 'http://localhost:3000/home'
