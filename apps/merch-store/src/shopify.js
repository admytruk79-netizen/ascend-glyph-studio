const domain=import.meta.env.VITE_SHOPIFY_STORE_DOMAIN||"8fcic1-nv.myshopify.com";
const token=import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN||"";
const endpoint=`https://${domain}/api/2026-07/graphql.json`;

export const shopifyReady=Boolean(domain&&token);
export async function storefront(query,variables={}){
 if(!shopifyReady) throw new Error("Shopify Storefront token not configured");
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Storefront-Access-Token":token},body:JSON.stringify({query,variables})});
 const json=await res.json(); if(!res.ok||json.errors) throw new Error(json.errors?.[0]?.message||"Shopify request failed"); return json.data;
}
export async function loadProducts(first=12){
 const data=await storefront(`query Products($first:Int!){products(first:$first,sortKey:CREATED_AT,reverse:true){nodes{id handle title description featuredImage{url altText} priceRange{minVariantPrice{amount currencyCode}} variants(first:20){nodes{id title availableForSale price{amount currencyCode} selectedOptions{name value}}}}}}`,{first});
 return data.products.nodes;
}
export async function createCart(variantId,quantity=1){
 const data=await storefront(`mutation CartCreate($input:CartInput!){cartCreate(input:$input){cart{id checkoutUrl totalQuantity} userErrors{field message}}}`,{input:{lines:[{merchandiseId:variantId,quantity}]}});
 if(data.cartCreate.userErrors.length) throw new Error(data.cartCreate.userErrors[0].message); return data.cartCreate.cart;
}
export {domain};