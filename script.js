let savingsChart;

// IMPORTANT:
// Replace the placeholder below with your NEW Hugging Face token.
// Do not upload your real token to GitHub.
const HF_TOKEN = "PASTE_YOUR_NEW_HF_TOKEN_HERE";
const HF_MODEL = "Qwen/Qwen2.5-7B-Instruct:together";

function formatCurrency(value) {
  return "₦" + Math.round(value).toLocaleString();
}

function buildInsightPrompt(data) {
  return `
You are a careful financial insight writer.

Write a concise, natural-sounding insight based ONLY on the values below.
Do not invent numbers.
Do not promise guaranteed returns.
Do not give financial advice.
Do not use bullet points.
Write in 2 short sentences maximum.
Use a simple and confident tone.

Data:
- Years: ${data.years}
- Annual inflation rate: ${data.inflationRatePercent}%
- Bank Savings Nominal Final Value: ${data.finalBank}
- Bank Savings Real Final Value: ${data.finalBankReal}
- Real Estate Nominal Final Value: ${data.finalRealEstate}
- Real Estate Real Final Value: ${data.finalRealEstateReal}
- Agriculture Nominal Final Value: ${data.finalAgriculture}
- Agriculture Real Final Value: ${data.finalAgricultureReal}
- Best Option by Real Value: ${data.bestOption}

Instructions:
1. Mention that inflation reduced real purchasing power if the real value is lower than the nominal value.
2. State which option performed best in this scenario using the real value comparison.
3. Keep it balanced by saying "in this scenario" where needed.
4. Return only the final insight text.
`.trim();
}

async function generateAIInsight(dataSummary) {
  const insightEl = document.getElementById("insightText");

  if (!HF_TOKEN || HF_TOKEN === "PASTE_YOUR_NEW_HF_TOKEN_HERE") {
    insightEl.innerText =
      `${dataSummary.bestOption} delivers the strongest inflation-adjusted outcome in this scenario, while inflation reduces the real purchasing power of ordinary savings over time.`;
    return;
  }

  insightEl.innerText = "Generating AI insight...";

  const prompt = buildInsightPrompt(dataSummary);

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a careful financial explanation assistant. Stay factual, concise, and grounded only in the provided data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 120
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const aiText = data?.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      throw new Error("No insight text returned.");
    }

    insightEl.innerText = aiText;
  } catch (error) {
    console.error("AI insight error:", error);
    insightEl.innerText =
      `${dataSummary.bestOption} delivers the strongest inflation-adjusted outcome in this scenario, while inflation reduces the real purchasing power of ordinary savings over time.`;
  }
}

async function calculateSavings() {
  const initialSavings = Number(document.getElementById("initialSavings").value) || 0;
  const monthlyContribution = Number(document.getElementById("monthlyContribution").value) || 0;
  const years = Number(document.getElementById("years").value) || 1;

  const bankRatePercent = Number(document.getElementById("bankRate").value) || 0;
  const inflationRatePercent = Number(document.getElementById("inflationRate").value) || 0;
  const realEstateRatePercent = Number(document.getElementById("realEstateRate").value) || 0;
  const agricultureRatePercent = Number(document.getElementById("agricultureRate").value) || 0;

  const bankRate = bankRatePercent / 100;
  const inflationRate = inflationRatePercent / 100;
  const realEstateRate = realEstateRatePercent / 100;
  const agricultureRate = agricultureRatePercent / 100;

  const yearlyContribution = monthlyContribution * 12;

  let bankValue = initialSavings;
  let realEstateValue = initialSavings;
  let agricultureValue = initialSavings;

  const labels = [];
  const bankData = [];
  const bankRealData = [];
  const realEstateData = [];
  const realEstateRealData = [];
  const agricultureData = [];
  const agricultureRealData = [];

  for (let i = 1; i <= years; i++) {
    bankValue = (bankValue + yearlyContribution) * (1 + bankRate);
    realEstateValue = (realEstateValue + yearlyContribution) * (1 + realEstateRate);
    agricultureValue = (agricultureValue + yearlyContribution) * (1 + agricultureRate);

    const inflationFactor = Math.pow(1 + inflationRate, i);

    const bankReal = bankValue / inflationFactor;
    const realEstateReal = realEstateValue / inflationFactor;
    const agricultureReal = agricultureValue / inflationFactor;

    labels.push("Year " + i);

    bankData.push(Math.round(bankValue));
    bankRealData.push(Math.round(bankReal));
    realEstateData.push(Math.round(realEstateValue));
    realEstateRealData.push(Math.round(realEstateReal));
    agricultureData.push(Math.round(agricultureValue));
    agricultureRealData.push(Math.round(agricultureReal));
  }

  const finalBank = bankData[bankData.length - 1] || 0;
  const finalBankReal = bankRealData[bankRealData.length - 1] || 0;
  const finalRealEstate = realEstateData[realEstateData.length - 1] || 0;
  const finalRealEstateReal = realEstateRealData[realEstateRealData.length - 1] || 0;
  const finalAgriculture = agricultureData[agricultureData.length - 1] || 0;
  const finalAgricultureReal = agricultureRealData[agricultureData.length - 1] || 0;

  document.getElementById("bankResult").innerText = formatCurrency(finalBank);
  document.getElementById("inflationResult").innerText = formatCurrency(finalBankReal);
  document.getElementById("realEstateResult").innerText = formatCurrency(finalRealEstate);
  document.getElementById("agricultureResult").innerText = formatCurrency(finalAgriculture);

  let bestOption = "Bank Savings";
  let bestValue = finalBankReal;

  if (finalRealEstateReal > bestValue) {
    bestOption = "Real Estate";
    bestValue = finalRealEstateReal;
  }

  if (finalAgricultureReal > bestValue) {
    bestOption = "Agriculture";
    bestValue = finalAgricultureReal;
  }

  document.getElementById("bestOption").innerText = bestOption;

  const canvas = document.getElementById("savingsChart");
  if (!canvas) {
    console.error("Canvas with id 'savingsChart' was not found.");
    return;
  }

  const ctx = canvas.getContext("2d");

  if (savingsChart) {
    savingsChart.destroy();
  }

  savingsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bank Savings (Nominal)",
          data: bankData,
          borderColor: "#38bdf8",
          backgroundColor: "#38bdf8",
          borderWidth: 3,
          pointRadius: 2,
          tension: 0.35,
          fill: false
        },
        {
          label: "Bank Savings (Real)",
          data: bankRealData,
          borderColor: "#7dd3fc",
          backgroundColor: "#7dd3fc",
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 1.5,
          tension: 0.35,
          fill: false
        },
        {
          label: "Real Estate (Nominal)",
          data: realEstateData,
          borderColor: "#22c55e",
          backgroundColor: "#22c55e",
          borderWidth: 3,
          pointRadius: 2,
          tension: 0.35,
          fill: false
        },
        {
          label: "Real Estate (Real)",
          data: realEstateRealData,
          borderColor: "#86efac",
          backgroundColor: "#86efac",
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 1.5,
          tension: 0.35,
          fill: false
        },
        {
          label: "Agriculture (Nominal)",
          data: agricultureData,
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          borderWidth: 3,
          pointRadius: 2,
          tension: 0.35,
          fill: false
        },
        {
          label: "Agriculture (Real)",
          data: agricultureRealData,
          borderColor: "#fcd34d",
          backgroundColor: "#fcd34d",
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 1.5,
          tension: 0.35,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#e2e8f0",
            boxWidth: 16,
            padding: 16,
            font: {
              family: "Inter",
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#cbd5e1"
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#cbd5e1",
            callback: function (value) {
              return "₦" + Number(value).toLocaleString();
            }
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        }
      }
    }
  });

  await generateAIInsight({
    years,
    inflationRatePercent,
    finalBank: formatCurrency(finalBank),
    finalBankReal: formatCurrency(finalBankReal),
    finalRealEstate: formatCurrency(finalRealEstate),
    finalRealEstateReal: formatCurrency(finalRealEstateReal),
    finalAgriculture: formatCurrency(finalAgriculture),
    finalAgricultureReal: formatCurrency(finalAgricultureReal),
    bestOption
  });
}

document.getElementById("calculateBtn").addEventListener("click", calculateSavings);
window.onload = calculateSavings;