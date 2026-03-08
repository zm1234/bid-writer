# UK Biobank 颈动脉斑块检测论文 - 方法部分摘要

## 论文信息

| 项目 | 内容 |
|---|---|
| **标题** | Automated Deep Learning-Based Detection of Early Atherosclerotic Plaques in Carotid Ultrasound Imaging |
| **DOI** | https://doi.org/10.1101/2024.10.17.24315675 |
| **数据来源** | UK Biobank (N=19,499) + BiDirect (N=2,105) |
| **模型** | YOLOv8l |
| **性能** | 准确率 89.3%, 敏感性 89.5%, 特异性 89.2% |

---

## 研究人群

### UK Biobank
- 502,422名参与者（40-69岁）
- 颈动脉超声成像访问：19,499人
- 超声图像：177,757张
- 平均年龄：64.6岁（SD=7.59）
- 女性占比：50.8%

### BiDirect Study（外部验证）
- 2,105名患者
- 使用不同超声设备（Acuson X300, Siemens）
- 不同扫描协议

---

## 图像预处理

### 步骤
1. **图像筛选**：自动检测长轴图像，排除cIMT测量图像
2. **图像裁剪**：480×448像素
3. **图像增强**：
   - OpenCV v4.7.0
   - 中值滤波 (ksize=5)
   - 对比度限制自适应直方图均衡化 (CLAHE, clipLimit=2.0, tileGridSize=8×8)

### 标注
- 两名医学博士手动标注
- 使用 Label Studio v1.8.2
- 斑块定义：局灶性突出物，厚度超过周围颈动脉内膜中层厚度(IMT)的50%

---

## 模型开发

### 模型选择
- **YOLOv8l** (YOLO v8 Large)
- 预训练数据集：超过330,000张图像

### 训练数据
- 标注图像：680张
- 有斑块图像：253张
- 数据集划分：
  - 训练集：73% (493张)
  - 验证集：12.5% (85张)
  - 测试集：15% (103张)

### 数据增强 (Albumentations)
```python
GridDistortion (p=0.15)
RandomBrightnessContrast ((0,0.5),(0,0.5))
HorizontalFlip (p=0.2)
GaussNoise (p=0.15)
RandomSizedCrop (min_max_height=(384,384), p=0.4)
```

### 训练参数
| 参数 | 值 |
|---|---|
| Batch Size | 44 |
| 初始学习率 (lr0) | 0.001 |
| 学习率调度器 | Cosine |
| Early Stopping | patience=5 |
| 最终训练轮次 | 14 epochs |
| 最佳轮次 | 第9轮 |
| GPU | NVIDIA QUADRO RTX 5000 (16GB) |
| 框架 | PyTorch 1.12.1 + Ultralytics 8.1.16 |

### 损失函数参数
- DFL (Distribution Focal Loss): 2.5
- Box Loss: 10
- CLS Loss: 1.1

---

## 外部验证（BiDirect数据集）

### Fine-tuning
- 标注图像：600张
- 有斑块：29.8% (179张)
- 数据集划分：训练336 / 验证144 / 测试120

### Fine-tuning参数
- 基础模型：UKB训练好的模型
- 学习率：0.0001（降低）
- Warmup epochs：0
- 增强：使用默认参数

### 验证结果
| 指标 | UKB测试集 | BiDirect测试集 |
|---|---|---|
| 准确率 | 89.3% | 85.8% |
| 敏感性 | 89.5% | 77.5% |
| 特异性 | 89.2% | 90.0% |
| PPV | 82.9% | 79.5% |
| mAP@50 | 68.4% | 65.1% |

---

## 临床预后分析

### 主要不良心血管事件 (MACE)
- 定义：心肌梗死、卒中、心血管死亡
- 随访时间：中位数55个月（范围1-80个月）

### 风险因素分析
- 多变量Logistic回归
- Cox比例风险模型
- 调整因素：年龄、性别、SBP、吸烟、糖尿病、HDL、LDL、他汀类药物使用

### 风险预测改进
- 将斑块信息整合到 Pooled Cohort Equations (PCE)
- 类别自由净重新分类改善 (cfNRI)：0.331-0.369

---

## 基因组分析

### GWAS
- 使用 Regenie v3.3
- 元分析：UKB + CHARGE
- 样本量：66,637人（29,790病例/36,847对照）

### Mendelian Randomization
- 使用 TwoSampleMR v0.6.7
- 发现：SBP、LDL、吸烟、糖尿病与颈动脉斑块相关

---

## 关键创新点

1. **首次**将深度学习应用于大规模无症状人群颈动脉斑块筛查
2. **迁移学习 + Fine-tuning**策略实现跨设备泛化
3. **结合遗传数据**：GWAS + MR揭示动脉粥样硬化生物学机制
4. **临床价值**：斑块信息改善心血管事件风险预测

---

## 参考文献（主要）

1. YOLOv8: https://github.com/ultralytics/ultralytics
2. Albumentations: https://github.com/albumentations-team/albumentations
3. OpenCV: https://opencv.org/
4. UK Biobank: https://www.ukbiobank.ac.uk
5. BiDirect Study: https://medizin.uni-muenster.de/en/epi

---

*本摘要提取自medRxiv预印本论文，DOI: 10.1101/2024.10.17.24315675*
