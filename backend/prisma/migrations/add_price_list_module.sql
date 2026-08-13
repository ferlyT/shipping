-- Migration: Add Price List Module Tables
-- Jalankan script ini di MS SQL Server Management Studio atau sqlcmd

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbPriceListUpload')
BEGIN
  CREATE TABLE tbPriceListUpload (
    id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
    fileName      NVARCHAR(500)    NOT NULL,
    uploadedBy    NVARCHAR(100)    NULL,
    uploadedAt    DATETIME2        NOT NULL DEFAULT GETDATE(),
    priceDate     DATETIME2        NULL,
    effectiveDate DATETIME2        NOT NULL,
    status        NVARCHAR(20)     NOT NULL,   -- PARSED | PARTIAL | FAILED
    warnings      NVARCHAR(MAX)    NULL,        -- JSON string
    rawSnapshot   NVARCHAR(MAX)    NULL,        -- JSON string
    isSuperseded  BIT              NOT NULL DEFAULT 0
  );
  PRINT 'Created table tbPriceListUpload';
END
ELSE
  PRINT 'Table tbPriceListUpload already exists, skipping.';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbPriceListItem')
BEGIN
  CREATE TABLE tbPriceListItem (
    id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
    uploadId      INT              NOT NULL,
    sheetType     NVARCHAR(20)     NOT NULL,   -- CS | MKT
    mode          NVARCHAR(50)     NOT NULL,   -- BY SEA | BY AIR
    branch        NVARCHAR(50)     NOT NULL,   -- destinasi / tujuan
    transitTime   NVARCHAR(50)     NULL,
    category      NVARCHAR(200)    NOT NULL,   -- kategori barang
    price         DECIMAL(18,2)    NOT NULL,
    CONSTRAINT FK_PriceListItem_Upload FOREIGN KEY (uploadId) REFERENCES tbPriceListUpload(id)
  );
  CREATE INDEX IX_PriceListItem_UploadId  ON tbPriceListItem(uploadId);
  CREATE INDEX IX_PriceListItem_SheetMode ON tbPriceListItem(sheetType, mode, branch, category);
  PRINT 'Created table tbPriceListItem';
END
ELSE
  PRINT 'Table tbPriceListItem already exists, skipping.';

PRINT 'Migration complete.';
