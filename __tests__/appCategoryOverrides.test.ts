import { classifyApp } from '../src/analysis/appClassifier';
import {
  getAppCategoryOverride,
  initAppCategoryOverrides,
  setAppCategoryOverride,
  clearAppCategoryOverride,
} from '../src/services/appCategoryOverrides';
import { getSetting, setSetting } from '../src/db/settingsRepository';

jest.mock('../src/db/settingsRepository', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

const mockedGetSetting = getSetting as jest.MockedFunction<typeof getSetting>;
const mockedSetSetting = setSetting as jest.MockedFunction<typeof setSetting>;

describe('appCategoryOverrides', () => {
  beforeEach(() => {
    mockedGetSetting.mockReset();
    mockedSetSetting.mockReset();
    mockedGetSetting.mockResolvedValue(null);
  });

  it('用户覆盖优先于内置包名映射', async () => {
    await initAppCategoryOverrides();
    await setAppCategoryOverride('com.tencent.mm', 'work', '微信');

    expect(getAppCategoryOverride('com.tencent.mm')).toBe('work');
    expect(classifyApp('com.tencent.mm', '微信')).toBe('work');
  });

  it('清除覆盖后恢复内置分类', async () => {
    await initAppCategoryOverrides();
    await setAppCategoryOverride('com.tencent.mm', 'work');
    await clearAppCategoryOverride('com.tencent.mm');

    expect(getAppCategoryOverride('com.tencent.mm')).toBeNull();
    expect(classifyApp('com.tencent.mm', '微信')).toBe('social');
  });
});
