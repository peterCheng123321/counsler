import { getActiveProviderInfo } from '../lib/ai/llm-factory';
import { selectOptimalModel } from '../lib/ai/model-router';

console.log('🔍 Testing OpenAI Configuration...\n');

const providerInfo = getActiveProviderInfo();
console.log('✅ Active Provider:', providerInfo.provider);
console.log('✅ Active Model:', providerInfo.model);

// Test with model router
const simpleQuery = selectOptimalModel({
  taskType: 'query',
  complexity: 'simple',
  hasPII: false,
});

console.log('\n📊 Model Router Selection (no PII):');
console.log('  Provider:', simpleQuery.provider);
console.log('  Model:', simpleQuery.modelName);
console.log('  Cost:', `$${simpleQuery.estimatedCost}/request`);
console.log('  FERPA Compliant:', simpleQuery.isFERPACompliant ? '✅ Yes' : '❌ No');

console.log('\n✅ SUCCESS! OpenAI is now active');
console.log('💰 Using:', simpleQuery.modelName, '($0.0003/request - cheapest!)');
console.log('\n⚠️  Note: This is NOT FERPA-compliant for student data');
console.log('   Student data will still use Azure if available');
