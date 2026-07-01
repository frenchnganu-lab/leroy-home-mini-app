const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/msfug3g73pcl92u2o92fxouerbxstejh";

const form = document.getElementById("leadForm");
const result = document.getElementById("result");

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  result.textContent = "Отправляем заявку...";

  const formData = new FormData(form);

  const user = tg?.initDataUnsafe?.user || {};

  const payload = {
    created_at: new Date().toLocaleString("ru-RU"),

    source: "Telegram Mini App",
    segment: "Дизайнеры",

    name: formData.get("name") || "",
    company: formData.get("company") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    interest: formData.get("interest") || "",
    comment: formData.get("comment") || "",

    telegram_id: user.id || "",
    telegram_username: user.username || "",
    telegram_first_name: user.first_name || "",
    telegram_last_name: user.last_name || ""
  };

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Ошибка отправки");
    }

    result.textContent = "Заявка отправлена. Мы скоро свяжемся с вами.";
    form.reset();

    if (tg) {
      tg.HapticFeedback.notificationOccurred("success");
    }

  } catch (error) {
    console.error(error);
    result.textContent = "Ошибка отправки. Попробуйте ещё раз или напишите нам в Telegram.";

    if (tg) {
      tg.HapticFeedback.notificationOccurred("error");
    }
  }
});
