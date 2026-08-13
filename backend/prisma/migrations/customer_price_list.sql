-- Create tbCustomerPriceListUpload (tanpa FK karena tbCustomers mungkin tidak punya formal PK constraint)
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'tbCustomerPriceListUpload') AND type = 'U')
BEGIN
  CREATE TABLE tbCustomerPriceListUpload (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    fdCustCode    CHAR(7)         NOT NULL,
    fileName      NVARCHAR(500)   NOT NULL,
    uploadedBy    NVARCHAR(100)   NULL,
    uploadedAt    DATETIME2       NOT NULL DEFAULT GETDATE(),
    priceDate     DATETIME2       NULL,
    effectiveDate DATETIME2       NOT NULL,
    status        NVARCHAR(20)    NOT NULL,
    warnings      NVARCHAR(MAX)   NULL,
    rawSnapshot   NVARCHAR(MAX)   NULL,
    isSuperseded  BIT             NOT NULL DEFAULT 0
  );
  PRINT 'Created tbCustomerPriceListUpload';
END
ELSE
  PRINT 'tbCustomerPriceListUpload already exists';

-- Create tbCustomerPriceListItem
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'tbCustomerPriceListItem') AND type = 'U')
BEGIN
  CREATE TABLE tbCustomerPriceListItem (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    uploadId      INT             NOT NULL,
    fdCustCode    CHAR(7)         NOT NULL,
    sheetType     NVARCHAR(20)    NOT NULL,
    mode          NVARCHAR(50)    NOT NULL,
    branch        NVARCHAR(50)    NOT NULL,
    transitTime   NVARCHAR(50)    NULL,
    category      NVARCHAR(200)   NOT NULL,
    price         DECIMAL(18, 2)  NOT NULL,
    CONSTRAINT FK_CustPriceListItem_Upload FOREIGN KEY (uploadId) REFERENCES tbCustomerPriceListUpload(id)
  );
  PRINT 'Created tbCustomerPriceListItem';
END
ELSE
  PRINT 'tbCustomerPriceListItem already exists';
