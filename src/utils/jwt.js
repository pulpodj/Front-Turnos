import { decodeJwt } from 'jose'


const KEY = 'gt_session_jwt'


export function saveSessionToken(token){
// En prod usar cookie httpOnly emitida por backend.
sessionStorage.setItem(KEY, token)
}


export function readSession(){
const token = sessionStorage.getItem(KEY)
if(!token) return null
try{
const payload = decodeJwt(token)
const now = Math.floor(Date.now()/1000)
if(payload.exp && payload.exp < now) return null
return { token, payload }
}catch{
return null
}
}


export function clearSession(){ sessionStorage.removeItem(KEY) }