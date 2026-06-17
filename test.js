import fs from 'fs';

const testApi = async () => {
  try {
    const baseUrl = 'http://localhost:5000/api/v1';
    console.log('🧪 Starting API Integration Tests...');

    // 1. Health check
    let res = await fetch(`${baseUrl}/health`);
    let data = await res.json();
    if (data.status !== 'success') throw new Error('Health check failed');
    console.log('✅ Health endpoint OK');

    // Due to the complexity of the full flow (Twilio OTP, Geocoding with Google Maps API key, Razorpay credentials),
    // a fully automated end-to-end script without real OTP interception is difficult to run headless.
    // However, we can test public routes.

    // 2. Explore Kitchens
    res = await fetch(`${baseUrl}/kitchens/nearby?latitude=28.6139&longitude=77.2090`);
    data = await res.json();
    if (data.status !== 'success') throw new Error('Failed to fetch nearby kitchens');
    console.log(`✅ Fetched ${data.data?.kitchens?.length || 0} nearby kitchens`);

    // 3. Search Foods (Actually, let's fetch foods for the first kitchen if available)
    if (data.data?.kitchens?.length > 0) {
      const kitchenId = data.data.kitchens[0]._id;
      res = await fetch(`${baseUrl}/foods/kitchen/${kitchenId}`);
      data = await res.json();
      if (data.status !== 'success') throw new Error('Failed to fetch kitchen foods');
      console.log(`✅ Fetched foods for kitchen ${kitchenId}`);
    }

    console.log('🎉 Public API Tests Passed Successfully!');
  } catch (err) {
    console.error('❌ Test Failed:', err.message);
  }
};

testApi();
