const app = require('./app');
const connectDB = require('./config/db');

// Only start the server locally if NOT running on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  });
}

// Vercel Serverless Function entry point
// Connects to DB if needed, then passes the request to Express
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
