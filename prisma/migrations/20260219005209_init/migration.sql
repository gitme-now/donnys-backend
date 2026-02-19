-- CreateEnum
CREATE TYPE "Source" AS ENUM ('YOUTUBE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "Trigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "remoteUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "channelHandle" TEXT NOT NULL,
    "rawMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "remoteUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "albumId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "channelHandle" TEXT NOT NULL,
    "rawMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "remoteUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "channelHandle" TEXT NOT NULL,
    "rawMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "channelHandle" TEXT NOT NULL,
    "pageName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "rawMeta" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "channelHandle" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "trigger" "Trigger" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "itemsProcessed" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_channelHandle_idx" ON "Video"("channelHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Video_remoteId_source_key" ON "Video"("remoteId", "source");

-- CreateIndex
CREATE INDEX "Photo_channelHandle_idx" ON "Photo"("channelHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_remoteId_source_key" ON "Photo"("remoteId", "source");

-- CreateIndex
CREATE INDEX "Event_channelHandle_idx" ON "Event"("channelHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Event_remoteId_source_key" ON "Event"("remoteId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_channelHandle_source_key" ON "Contact"("channelHandle", "source");

-- CreateIndex
CREATE INDEX "ScrapeRun_channelHandle_idx" ON "ScrapeRun"("channelHandle");

-- CreateIndex
CREATE INDEX "ScrapeRun_status_idx" ON "ScrapeRun"("status");
