const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes MUST come before static files
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Gadge Creations payment server is running",
    environment: process.env.CASHFREE_ENV || "sandbox"
  });
});

app.post("/api/create-order", async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Please fill all customer details."
      });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const environment = process.env.CASHFREE_ENV || "sandbox";
    const baseUrl = process.env.BASE_URL;

    if (!appId || !secretKey) {
      return res.status(500).json({
        success: false,
        message: "Cashfree credentials are missing in .env"
      });
    }

    if (!baseUrl || !baseUrl.startsWith("https://")) {
      return res.status(500).json({
        success: false,
        message: "BASE_URL must be a public HTTPS URL."
      });
    }

    const apiUrl =
      environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const orderId =
      "GC_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 8);

    const cashfreeResponse = await fetch(
      `${apiUrl}/orders`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": "2025-01-01"
        },

        body: JSON.stringify({
          order_id: orderId,
          order_amount: 199,
          order_currency: "INR",

          customer_details: {
            customer_id:
              "customer_" + Date.now(),

            customer_name:
              customerName,

            customer_email:
              customerEmail,

            customer_phone:
              customerPhone
          },

          order_meta: {
            return_url:
              `${baseUrl}/payment-success.html?order_id={order_id}`
          },

          order_note:
            "Gadge Creations - 500 AI Prompts eBook"
        })
      }
    );

    const data =
      await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      console.error(
        "Cashfree Error:",
        data
      );

      return res.status(
        cashfreeResponse.status
      ).json({
        success: false,
        message:
          data.message ||
          "Cashfree order creation failed.",
        error: data
      });
    }

    return res.json({
      success: true,
      orderId:
        data.order_id,
      paymentSessionId:
        data.payment_session_id
    });

  } catch (error) {

    console.error(
      "Create Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating payment.",
      error:
        error.message
    });
  }
});

// Serve website from project root
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/payment-success.html", (req, res) => {
  res.sendFile(path.join(__dirname, "payment-success.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(
    `Gadge Creations server running at http://localhost:${PORT}`
  );

  console.log(
    `Cashfree environment: ${
      process.env.CASHFREE_ENV || "sandbox"
    }`
  );
});