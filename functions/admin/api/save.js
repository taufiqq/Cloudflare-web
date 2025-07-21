export const onRequestPost = async (context) => {
  const objId = context.env.TOKEN_STORE.idFromName("token-store");
  const obj = context.env.TOKEN_STORE.get(objId);
  const body = await context.request.text();

  return await obj.fetch("https://internal/save", {
    method: "POST",
    body,
  });
};
