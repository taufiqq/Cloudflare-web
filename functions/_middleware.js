export const onRequest = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/admin")) {
    return context.next(); // ke admin panel atau API
  }

  // Routing ke validator
  const [_, id, token] = pathname.split("/");
  if (!id || !token) {
    return new Response("Format URL salah", { status: 400 });
  }

  const idName = "token-store"; // satu DO saja
  const objId = context.env.TOKEN_STORE.idFromName(idName);
  const obj = context.env.TOKEN_STORE.get(objId);

  const tokenRes = await obj.fetch(`https://internal/get/${id}`);
  if (tokenRes.status !== 200) {
    return new Response("ID tidak ditemukan", { status: 404 });
  }

  const savedToken = await tokenRes.text();
  if (savedToken !== token) {
    return new Response("Token salah", { status: 403 });
  }

  return new Response("Sukses akses!", { status: 200 });
};
