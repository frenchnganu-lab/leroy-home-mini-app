const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const form = document.getElementById("leadForm");
const result = document.getElementById("result");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const formData = new FormData(form);

  const lead = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    clientType: formData.get("clientType"),
    product: formData.get("product"),
    comment: formData.get("comment"),
    telegramUsername: tg?.initDataUnsafe?.user?.username || "Не определён"
  };

  console.log("Новая заявка:", lead);

  result.textContent = "Заявка отправлена в тестовом режиме. Позже подключим Bitrix и Telegram-группу.";

  form.reset();
});