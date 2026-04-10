import QRCode from "qrcode";

export const buildTokenQrPayload = (token, frontendUrl = null) => {
  const payload = {
    tokenNumber: token.tokenNumber,
    displayToken: token.displayToken,
    priority: token.priority,
    status: token.status,
  };

  if (frontendUrl) {
    payload.url = `${frontendUrl.replace(/\/$/, "")}/my-token?token=${token.tokenNumber}`;
  }

  return JSON.stringify(payload);
};

export const createTokenQrDataUrl = async (token, frontendUrl = null) => {
  const qrPayload = buildTokenQrPayload(token, frontendUrl);

  return QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });
};
