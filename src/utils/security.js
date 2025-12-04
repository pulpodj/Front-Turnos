import Cookies from 'js-cookie'


const CSRF_COOKIE = 'csrf_token'


export function ensureCsrfToken(){
let t = Cookies.get(CSRF_COOKIE)
if(!t){
t = crypto.getRandomValues(new Uint32Array(4)).join('')
Cookies.set(CSRF_COOKIE, t, { sameSite: 'strict', secure: true })
}
return t
}


export function getCsrfHeader(){
return { 'X-CSRF-Token': ensureCsrfToken() }
}