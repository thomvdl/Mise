-- MySQL dump 10.13  Distrib 8.4.11, for Linux (aarch64)
--
-- Host: localhost    Database: mise
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `allergen_ingredient`
--

DROP TABLE IF EXISTS `allergen_ingredient`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergen_ingredient` (
  `allergen_id` bigint unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`allergen_id`,`ingredient_id`),
  KEY `allergen_ingredient_ingredient_id_foreign` (`ingredient_id`),
  CONSTRAINT `allergen_ingredient_allergen_id_foreign` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE,
  CONSTRAINT `allergen_ingredient_ingredient_id_foreign` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergen_ingredient`
--

LOCK TABLES `allergen_ingredient` WRITE;
/*!40000 ALTER TABLE `allergen_ingredient` DISABLE KEYS */;
INSERT INTO `allergen_ingredient` VALUES (1,1),(1,2),(1,3),(1,8),(1,12),(1,13),(1,14),(1,16),(1,18),(1,22),(1,24),(2,24),(1,25),(2,26),(2,27),(2,28),(2,29),(2,30),(2,31),(2,32),(2,33),(2,34),(2,35),(2,36),(2,37),(2,38),(2,39),(2,40),(2,41),(2,42),(2,43),(2,44),(2,45),(2,46),(2,47),(2,48),(2,49),(2,50),(3,51),(3,52),(3,53),(3,54),(3,55),(4,56),(4,57),(4,58),(4,59),(4,60),(4,61),(4,62),(4,63),(11,64),(11,65),(12,68),(10,72),(5,76),(5,77),(5,78),(5,79),(5,80),(5,81),(5,82),(5,83),(5,84),(5,85),(5,86),(5,87),(5,88),(5,89),(5,90),(5,91),(6,92),(6,93),(6,94),(6,95),(6,96),(13,97),(13,98),(13,99),(13,100),(7,136),(7,137),(8,211),(1,212),(9,212),(3,235),(5,236),(10,241),(10,242),(10,243),(10,244),(10,245),(1,248),(10,249),(2,251),(2,253),(5,261),(3,262),(3,266),(1,267),(3,267),(5,270),(3,277),(2,285),(5,288),(12,294),(1,298),(2,298),(3,298),(4,299),(2,300),(9,308),(9,309),(5,312),(2,319),(2,320),(1,321),(2,323),(3,325),(2,345),(1,346),(2,346),(3,346),(2,349);
/*!40000 ALTER TABLE `allergen_ingredient` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `allergens`
--

DROP TABLE IF EXISTS `allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `allergens_name_unique` (`name`),
  UNIQUE KEY `allergens_slug_unique` (`slug`),
  UNIQUE KEY `allergens_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergens`
--

LOCK TABLES `allergens` WRITE;
/*!40000 ALTER TABLE `allergens` DISABLE KEYS */;
INSERT INTO `allergens` VALUES (1,'gluten','gluten','GLU','#CA8A04','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'lait','lait','LAI','#60A5FA','2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,'oeuf','oeuf','OEU','#FDE047','2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,'fruits Coque','fruits-coque','FDC','#92400E','2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,'poisson','poisson','POI','#0EA5E9','2026-07-30 17:21:42','2026-07-30 17:21:42'),(6,'crustaces','crustaces','CRU','#F97316','2026-07-30 17:21:42','2026-07-30 17:21:42'),(7,'celeri','celeri','CEL','#4ADE80','2026-07-30 17:21:42','2026-07-30 17:21:42'),(8,'moutarde','moutarde','MOU','#EAB308','2026-07-30 17:21:42','2026-07-30 17:21:42'),(9,'soja','soja','SOJ','#A3E635','2026-07-30 17:21:42','2026-07-30 17:21:42'),(10,'sulfites','sulfites','SUL','#A855F7','2026-07-30 17:21:42','2026-07-30 17:21:42'),(11,'arachides','arachides','ARA','#B45309','2026-09-09 19:07:04','2026-09-09 19:07:04'),(12,'sésame','sesame','SES','#14B8A6','2026-09-09 19:07:04','2026-09-09 19:07:04'),(13,'mollusques','mollusques','MOL','#6366F1','2026-09-09 19:07:04','2026-09-09 19:07:04'),(14,'lupin','lupin','LUP','#EC4899','2026-09-09 19:07:04','2026-09-09 19:07:04');
/*!40000 ALTER TABLE `allergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appareils`
--

DROP TABLE IF EXISTS `appareils`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appareils` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abbreviation` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fonction` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `temperature_min` decimal(4,1) DEFAULT NULL,
  `temperature_max` decimal(4,1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appareils`
--

LOCK TABLES `appareils` WRITE;
/*!40000 ALTER TABLE `appareils` DISABLE KEYS */;
INSERT INTO `appareils` VALUES (1,'Frigo (exemple)','FR-EX','Chambre froide légumes (exemple)',2.0,5.0,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Chambre froide légumes','CFL','Légumes',3.0,6.0,'2026-08-01 21:06:07','2026-08-01 21:06:07');
/*!40000 ALTER TABLE `appareils` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Amuse-bouche','amuse-bouche','#F97316','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Entrées','entrees','#84CC16','2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,'Poissons','poissons','#0EA5E9','2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,'Viandes','viandes','#EF4444','2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,'Desserts','desserts','#EC4899','2026-07-30 17:21:42','2026-07-30 17:21:42'),(6,'Soupes','soupes','#F59E0B','2026-07-30 17:21:42','2026-07-30 17:21:42'),(7,'Salades','salades','#22C55E','2026-07-30 17:21:42','2026-07-30 17:21:42'),(8,'Pâtes','pates','#EAB308','2026-07-30 17:21:42','2026-07-30 17:21:42'),(9,'Riz','riz','#14B8A6','2026-07-30 17:21:42','2026-07-30 17:21:42'),(10,'Légumes','legumes','#10B981','2026-07-30 17:21:42','2026-07-30 17:21:42'),(11,'Fromages','fromages','#D97706','2026-07-30 17:21:42','2026-07-30 17:21:42'),(12,'Sauces','sauces','#F43F5E','2026-07-30 17:21:42','2026-07-30 17:21:42'),(13,'Boissons','boissons','#3B82F6','2026-07-30 17:21:42','2026-07-30 17:21:42'),(14,'Cocktails','cocktails','#D946EF','2026-07-30 17:21:42','2026-07-30 17:21:42'),(15,'Petit-déjeuner','petit-dejeuner','#8B5CF6','2026-07-30 17:21:42','2026-07-30 17:21:42'),(16,'Brunch','brunch','#06B6D4','2026-07-30 17:21:42','2026-07-30 17:21:42');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `changement_huiles`
--

DROP TABLE IF EXISTS `changement_huiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `changement_huiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `friteuse_id` bigint unsigned NOT NULL,
  `date_changement` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `changement_huiles_friteuse_id_date_changement_index` (`friteuse_id`,`date_changement`),
  CONSTRAINT `changement_huiles_friteuse_id_foreign` FOREIGN KEY (`friteuse_id`) REFERENCES `friteuses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `changement_huiles`
--

LOCK TABLES `changement_huiles` WRITE;
/*!40000 ALTER TABLE `changement_huiles` DISABLE KEYS */;
INSERT INTO `changement_huiles` VALUES (1,1,'2026-06-15','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,1,'2026-07-20','2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,1,'2026-06-17','2026-08-01 20:35:51','2026-08-01 20:35:51'),(4,1,'2026-07-22','2026-08-01 20:35:51','2026-08-01 20:35:51'),(5,1,'2026-08-01','2026-08-01 20:55:07','2026-08-01 20:55:07'),(6,1,'2026-08-01','2026-08-01 21:06:33','2026-08-01 21:06:33'),(7,1,'2026-08-01','2026-08-01 21:06:53','2026-08-01 21:06:53'),(8,1,'2026-09-07','2026-09-07 17:33:45','2026-09-07 17:33:45');
/*!40000 ALTER TABLE `changement_huiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `channels`
--

DROP TABLE IF EXISTS `channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `channels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `channels`
--

LOCK TABLES `channels` WRITE;
/*!40000 ALTER TABLE `channels` DISABLE KEYS */;
INSERT INTO `channels` VALUES (1,'Général',0,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Viande',1,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,'Poisson',2,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,'Froid',3,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,'Dessert',4,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(6,'Brunch',5,'2026-07-30 17:21:42','2026-07-30 17:21:42');
/*!40000 ALTER TABLE `channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` text COLLATE utf8mb4_unicode_ci,
  `horaire` longtext COLLATE utf8mb4_unicode_ci,
  `couverts` int unsigned DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `menu_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `events_menu_id_foreign` (`menu_id`),
  KEY `events_start_date_end_date_index` (`start_date`,`end_date`),
  CONSTRAINT `events_menu_id_foreign` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1,'Brunch (exemple)','Brunch de démonstration ouvert à tous, formule à volonté.','10h00 - 14h00',25,'brunch','2026-08-04','2026-08-04',1,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Réservation groupe (exemple)','Réservation d\'un groupe de 15 personnes, menu à confirmer.','19h30',15,'groupe','2026-08-11','2026-08-11',NULL,'2026-07-30 17:21:42','2026-07-30 17:21:42');
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fiche_technique_ingredient`
--

DROP TABLE IF EXISTS `fiche_technique_ingredient`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fiche_technique_ingredient` (
  `fiche_technique_id` bigint unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  `quantity` decimal(8,2) NOT NULL,
  `group_label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`fiche_technique_id`,`ingredient_id`),
  KEY `fiche_technique_ingredient_ingredient_id_foreign` (`ingredient_id`),
  CONSTRAINT `fiche_technique_ingredient_fiche_technique_id_foreign` FOREIGN KEY (`fiche_technique_id`) REFERENCES `fiche_techniques` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fiche_technique_ingredient_ingredient_id_foreign` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fiche_technique_ingredient`
--

LOCK TABLES `fiche_technique_ingredient` WRITE;
/*!40000 ALTER TABLE `fiche_technique_ingredient` DISABLE KEYS */;
INSERT INTO `fiche_technique_ingredient` VALUES (2,26,0.04,NULL),(2,30,0.20,NULL),(2,138,0.50,NULL),(2,213,0.00,NULL),(2,251,0.40,NULL),(2,252,0.15,NULL),(3,1,0.13,'Chili cheese nuget'),(3,22,0.25,'Chili cheese nuget'),(3,23,0.02,'Sauce cheddar'),(3,26,0.13,'Chili cheese nuget'),(3,29,0.25,'Sauce cheddar'),(3,30,1.25,'Chili cheese nuget'),(3,39,0.38,'Chili cheese nuget'),(3,51,5.00,'Chili cheese nuget'),(3,213,0.00,'Chili cheese nuget'),(3,214,0.00,'Chili cheese nuget'),(3,253,0.38,'Chili cheese nuget'),(3,254,13.00,'Chili cheese nuget'),(3,255,2.50,'Chili cheese nuget'),(3,256,2.50,'Chili cheese nuget'),(3,257,1.00,'Chili cheese nuget'),(3,345,0.20,'Sauce cheddar'),(4,26,0.08,NULL),(4,78,0.25,NULL),(4,141,0.08,NULL),(4,213,0.01,NULL),(4,241,0.05,NULL),(4,258,0.50,NULL),(4,259,25.00,NULL),(4,260,25.00,NULL),(4,261,5.00,NULL),(4,262,10.00,NULL),(4,263,2.50,NULL),(4,264,25.00,NULL),(4,265,2.00,NULL),(5,1,0.68,NULL),(5,22,0.30,NULL),(5,26,0.28,NULL),(5,30,1.00,NULL),(5,38,0.40,NULL),(5,40,0.20,NULL),(5,214,0.00,NULL),(5,220,0.00,NULL),(5,266,10.00,NULL),(6,1,0.50,NULL),(6,26,0.07,NULL),(6,30,1.00,NULL),(6,51,6.00,NULL),(6,213,0.00,NULL),(6,238,0.05,NULL),(7,29,1.00,NULL),(7,40,0.10,NULL),(7,132,1.00,NULL),(7,136,0.20,NULL),(7,139,0.30,NULL),(7,140,0.30,NULL),(7,213,0.00,NULL),(7,214,0.00,NULL),(7,229,0.50,NULL),(7,242,0.50,NULL),(7,258,1.00,NULL),(7,267,1.20,NULL),(7,268,10.00,NULL),(7,269,10.00,NULL),(8,26,0.15,NULL),(8,29,0.40,NULL),(8,141,0.10,NULL),(8,213,0.00,NULL),(8,214,0.00,NULL),(8,241,0.30,NULL),(8,270,0.50,NULL),(9,1,0.05,'Cuisson'),(9,26,0.10,'Cuisson'),(9,114,0.50,'Garniture'),(9,139,0.50,'Marinade'),(9,140,0.30,'Marinade'),(9,150,0.30,'Garniture'),(9,174,0.50,'Garniture'),(9,242,2.00,'Marinade'),(9,268,12.00,'Marinade'),(9,271,3.50,'Marinade'),(9,272,3.00,'Marinade'),(9,273,4.00,'Marinade'),(9,274,20.00,'Marinade'),(9,275,5.00,'Marinade'),(10,1,0.06,NULL),(10,26,0.00,NULL),(10,27,0.16,NULL),(10,51,4.00,NULL),(10,238,0.14,NULL),(10,276,0.20,NULL),(10,277,4.00,NULL),(10,278,0.00,NULL),(11,76,1.40,NULL),(11,238,0.50,NULL),(11,279,0.50,NULL),(11,280,0.08,NULL),(11,281,2.00,NULL),(11,282,2.00,NULL),(11,283,2.00,NULL),(11,284,1.00,NULL),(12,29,0.50,NULL),(12,30,0.27,NULL),(12,213,0.00,NULL),(12,214,0.00,NULL),(12,229,0.16,NULL),(12,265,3.00,NULL),(12,285,0.40,NULL),(13,51,2.00,'Sauce'),(13,79,0.25,'Sauce'),(13,136,0.08,'Réduction de marinade'),(13,139,0.17,'Réduction de marinade'),(13,141,0.10,'Réduction de marinade'),(13,143,0.25,'Réduction de marinade'),(13,176,2.00,'Réduction de marinade'),(13,213,0.00,'Sauce'),(13,231,0.50,'Sauce'),(13,241,0.42,'Réduction de marinade'),(13,258,0.25,'Réduction de marinade'),(13,259,25.00,'Sauce'),(13,260,25.00,'Sauce'),(13,261,8.00,'Sauce'),(13,268,2.00,'Réduction de marinade'),(13,272,2.00,'Réduction de marinade'),(13,274,7.00,'Réduction de marinade'),(13,286,1.67,'Viande'),(13,287,3.00,'Réduction de marinade'),(14,22,0.25,NULL),(14,51,2.00,NULL),(14,138,0.42,NULL),(14,213,0.01,NULL),(14,229,0.03,NULL),(14,257,1.00,NULL),(14,288,0.40,NULL),(14,289,25.00,NULL),(14,290,0.00,NULL),(16,26,0.04,NULL),(16,29,0.30,NULL),(16,141,0.10,NULL),(16,213,0.00,NULL),(16,246,0.05,NULL),(16,258,0.40,NULL),(16,274,30.00,NULL),(17,26,0.04,NULL),(17,29,0.30,NULL),(17,141,0.10,NULL),(17,150,0.40,NULL),(17,176,0.00,NULL),(17,213,0.00,NULL),(17,214,0.00,NULL),(17,241,0.10,NULL),(17,258,0.30,NULL),(18,23,0.04,'Chou-fleur'),(18,153,1.75,'Chou-fleur'),(18,213,0.01,'Chou-fleur'),(18,229,0.04,'Chou-fleur'),(18,235,0.19,'Glaçage et sauce'),(18,237,0.32,'Glaçage et sauce'),(18,255,1.25,'Chou-fleur'),(18,256,1.25,'Chou-fleur'),(18,282,1.25,'Chou-fleur'),(18,291,0.15,'Glaçage et sauce'),(18,292,1.25,'Chou-fleur'),(18,293,0.04,'Glaçage et sauce'),(18,294,0.01,'Glaçage et sauce'),(19,1,0.20,'Panure et garniture'),(19,10,1.00,'Riz au safran'),(19,22,250.00,'Panure et garniture'),(19,26,0.10,'Riz au safran'),(19,39,0.40,'Panure et garniture'),(19,40,0.30,'Riz au safran'),(19,51,6.00,'Riz au safran'),(19,101,0.90,'Ragù'),(19,139,0.40,'Ragù'),(19,140,0.40,'Ragù'),(19,165,1.50,'Ragù'),(19,213,0.00,'Panure et garniture'),(19,214,0.00,'Panure et garniture'),(19,220,0.00,'Riz au safran'),(19,241,0.20,'Ragù'),(19,257,1.00,'Panure et garniture'),(19,295,2.00,'Riz au safran'),(19,296,4.00,'Ragù'),(20,36,1.00,NULL),(20,51,12.00,NULL),(20,213,0.00,NULL),(20,238,0.20,NULL),(20,278,0.00,NULL),(20,297,0.80,NULL),(20,298,4.00,NULL),(20,299,0.00,NULL),(21,10,0.63,NULL),(21,26,0.05,NULL),(21,37,0.25,NULL),(21,117,0.88,NULL),(21,141,0.05,NULL),(21,213,0.00,NULL),(21,214,0.00,NULL),(21,229,0.08,NULL),(21,241,0.50,NULL),(21,300,0.09,NULL),(21,301,2.00,NULL),(21,302,0.63,NULL),(22,26,0.08,NULL),(22,29,0.50,NULL),(22,138,1.75,NULL),(22,213,0.00,NULL),(22,214,0.00,NULL),(22,225,0.01,NULL),(22,229,0.00,NULL),(22,268,5.00,NULL),(22,303,5.00,NULL),(23,23,0.38,'Panure'),(23,129,1.42,'Poulet'),(23,212,0.04,'Marinade'),(23,213,0.01,'Marinade et épices'),(23,215,0.01,'Marinade et épices'),(23,238,0.03,'Marinade'),(23,257,0.00,'Panure'),(23,266,3.00,'Marinade'),(23,268,8.00,'Marinade'),(23,304,0.03,'Marinade'),(23,305,3.75,'Marinade et épices'),(23,306,0.75,'Panure'),(24,51,10.00,'Base'),(24,64,0.18,'Garniture (facultatif)'),(24,129,0.90,'Base'),(24,141,0.05,'Base'),(24,186,0.00,'Garniture (facultatif)'),(24,213,0.01,'Base'),(24,230,0.15,'Base'),(24,268,10.00,'Base'),(24,307,0.58,'Base'),(24,308,0.58,'Base'),(24,309,0.50,'Base'),(24,310,0.10,'Base'),(24,311,0.23,'Sauce pour nouilles'),(24,312,0.11,'Sauce pour nouilles'),(24,313,0.35,'Sauce pour nouilles'),(26,1,0.06,'Sauce suprême'),(26,26,0.14,'Divers'),(26,28,0.09,'Sauce suprême'),(26,29,0.40,'Purée de pommes de terre'),(26,51,4.00,'Sauce suprême'),(26,138,1.60,'Purée de pommes de terre'),(26,140,0.12,'Champignons'),(26,141,0.05,'Champignons'),(26,175,1.00,'Purée de pommes de terre'),(26,185,0.30,'Sauce suprême'),(26,213,0.00,'Divers'),(26,214,0.00,'Divers'),(26,220,0.00,'Sauce suprême'),(26,229,0.03,'Champignons'),(26,329,10.00,'Volaille'),(26,330,0.80,'Champignons'),(26,331,1.00,'Sauce suprême'),(27,26,0.35,'Purée & garniture de petits pois'),(27,29,0.25,'Purée & garniture de petits pois'),(27,77,1.25,'Cabillaud marbré'),(27,165,1.75,'Purée & garniture de petits pois'),(27,167,0.25,'Purée & garniture de petits pois'),(27,213,0.02,'Purée & garniture de petits pois'),(27,214,0.01,'Purée & garniture de petits pois'),(27,229,0.05,'Cabillaud marbré'),(27,279,0.05,'Purée & garniture de petits pois'),(27,332,8.00,'Cabillaud marbré'),(27,333,20.00,'Purée & garniture de petits pois'),(28,175,2.50,'Herbes et condiments'),(28,176,2.50,'Herbes et condiments'),(28,211,0.08,'Mayonnaise'),(28,213,0.02,'Mayonnaise'),(28,214,0.01,'Mayonnaise'),(28,230,1.00,'Mayonnaise'),(28,259,200.00,'Herbes et condiments'),(28,325,10.00,'Mayonnaise'),(28,334,2.50,'Herbes et condiments'),(28,335,75.00,'Herbes et condiments'),(28,336,300.00,'Herbes et condiments'),(28,337,0.05,'Mayonnaise'),(29,1,0.25,'Pâte à beignet'),(29,77,1.00,'Cabillaud en beignet'),(29,138,1.00,'Frites'),(29,213,0.01,'Pâte à beignet'),(29,248,0.38,'Pâte à beignet'),(29,257,1.50,'Friture'),(29,266,3.00,'Pâte à beignet'),(30,22,0.06,'Finition'),(30,26,0.13,'Purée de pommes de terre'),(30,30,0.38,'Purée de pommes de terre'),(30,43,0.06,'Finition'),(30,105,1.25,'Bœuf'),(30,138,1.88,'Purée de pommes de terre'),(30,139,0.38,'Aromates'),(30,140,0.38,'Aromates'),(30,143,0.25,'Aromates'),(30,229,0.06,'Bœuf'),(30,268,4.00,'Aromates'),(30,272,5.00,'Aromates'),(30,273,3.00,'Aromates'),(30,338,1.25,'Aromates'),(30,339,2.50,'Carottes rôties'),(31,1,0.50,'Pâte à pâté croûte'),(31,26,0.25,'Pâte à pâté croûte'),(31,113,0.25,'Farce'),(31,139,0.30,'Jardinière de légumes'),(31,141,0.02,'Farce'),(31,146,0.20,'Jardinière de légumes'),(31,213,0.03,'Pâte à pâté croûte'),(31,214,0.01,'Farce'),(31,229,0.02,'Farce'),(31,233,0.10,'Jardinière de légumes'),(31,238,0.03,'Jardinière de légumes'),(31,246,0.01,'Farce'),(31,340,0.25,'Farce'),(31,341,0.30,'Farce'),(31,342,0.50,'Farce'),(31,343,0.10,'Jardinière de légumes'),(31,344,0.02,'Pâte à pâté croûte'),(32,11,0.75,'Garniture'),(32,68,0.08,'Poisson'),(32,76,1.50,'Poisson'),(32,145,3.00,'Garniture'),(32,157,0.75,'Garniture'),(32,162,0.50,'Garniture'),(32,186,0.50,'Poisson'),(32,209,5.00,'Dressage'),(32,212,0.13,'Poisson'),(32,213,0.00,'Garniture'),(32,214,0.00,'Garniture'),(32,229,0.05,'Garniture'),(33,29,0.63,'Crème'),(33,36,0.50,'Crème'),(33,192,1.25,'Coulis et garniture'),(33,346,15.00,'Feuilles croustillantes'),(33,347,0.20,'Feuilles croustillantes'),(33,348,0.10,'Feuilles croustillantes'),(33,349,0.45,'Crème'),(33,350,0.50,'Coulis et garniture');
/*!40000 ALTER TABLE `fiche_technique_ingredient` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fiche_technique_plat`
--

DROP TABLE IF EXISTS `fiche_technique_plat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fiche_technique_plat` (
  `plat_id` bigint unsigned NOT NULL,
  `fiche_technique_id` bigint unsigned NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`plat_id`,`fiche_technique_id`),
  KEY `fiche_technique_plat_fiche_technique_id_foreign` (`fiche_technique_id`),
  CONSTRAINT `fiche_technique_plat_fiche_technique_id_foreign` FOREIGN KEY (`fiche_technique_id`) REFERENCES `fiche_techniques` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fiche_technique_plat_plat_id_foreign` FOREIGN KEY (`plat_id`) REFERENCES `plats` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fiche_technique_plat`
--

LOCK TABLES `fiche_technique_plat` WRITE;
/*!40000 ALTER TABLE `fiche_technique_plat` DISABLE KEYS */;
INSERT INTO `fiche_technique_plat` VALUES (26,2,1),(26,5,2),(27,20,1),(28,10,1),(40,28,2),(40,29,1),(41,3,1),(42,18,1),(43,19,1),(44,11,1),(45,24,1),(46,26,1),(47,9,1),(47,22,2),(48,27,1),(49,20,1),(50,10,1),(51,33,1);
/*!40000 ALTER TABLE `fiche_technique_plat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fiche_techniques`
--

DROP TABLE IF EXISTS `fiche_techniques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fiche_techniques` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `station_id` bigint unsigned DEFAULT NULL,
  `servings` int unsigned NOT NULL DEFAULT '10',
  `difficulty` tinyint unsigned NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `equipment` json DEFAULT NULL,
  `mise_en_place` text COLLATE utf8mb4_unicode_ci,
  `plating` text COLLATE utf8mb4_unicode_ci,
  `chef_tip` text COLLATE utf8mb4_unicode_ci,
  `haccp` text COLLATE utf8mb4_unicode_ci,
  `conservation` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fiche_techniques_slug_unique` (`slug`),
  KEY `fiche_techniques_category_id_foreign` (`category_id`),
  KEY `fiche_techniques_station_id_foreign` (`station_id`),
  CONSTRAINT `fiche_techniques_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fiche_techniques_station_id_foreign` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fiche_techniques`
--

LOCK TABLES `fiche_techniques` WRITE;
/*!40000 ALTER TABLE `fiche_techniques` DISABLE KEYS */;
INSERT INTO `fiche_techniques` VALUES (2,'Espuma pomme de terre fumée & lard croustillant','espuma-pomme-de-terre-fumee-lard-croustillant',1,3,10,1,NULL,'[\"Sauteuse\", \"Siphon\", \"Chinois\"]','Mise en place : environ 5 min. Préparation : environ 5 min.',NULL,NULL,NULL,NULL,'2026-08-18 19:24:38','2026-08-18 19:25:54'),(3,'Chili Cheese Nuggets / sauce cheddar','chili-cheese-nuggets',1,3,10,2,NULL,'[\"Grande casserole\", \"Fouet\", \"2 à 3 saladiers\", \"Grand plat pour refroidissement\", \"Film alimentaire\", \"3 bacs (farine / œufs / chapelure)\", \"Friteuse ou grande marmite\", \"Papier absorbant\", \"Thermomètre de cuisson recommandé\"]','Temps de production : Préparation 30 min, Cuisson 15 min, Repos 3 h (total 45 min + repos).','Servir les nuggets chauds accompagnés de la sauce cheddar en saucière ou en pot individuel pour la trempette.','Béchamel doit être très épaisse sinon instable en grand volume. Refroidissement obligatoire pour façonnage propre. Bien contrôler la température de l\'huile (180°C constant). Frire en petites quantités pour éviter éclatement et chute de température. Organisation en brigade recommandée (panure + friture séparées).',NULL,NULL,'2026-08-18 19:27:47','2026-09-09 19:35:12'),(4,'Vitello Tonnato Espuma','vitello-tonnato-espuma',12,3,10,2,NULL,'[\"Casserole\", \"Planche à découper\", \"Couteau d\'office\", \"Balance de précision\", \"Mixeur plongeant\", \"Chinois étamine ou passoire fine\", \"Pichet gradué\", \"Siphon 1 L (ou 2 siphons de 0,5 L)\", \"Réfrigérateur\"]','Temps de réalisation : Préparation 20 min, Cuisson 15 min, Refroidissement 30 min, Repos au froid 2 h minimum (total ≈ 3 h 05).',NULL,'Refroidir la préparation avant d\'ajouter le Proespuma Frio pour garantir une bonne tenue de l\'espuma. Mixer très finement et filtrer soigneusement afin d\'éviter l\'obstruction du siphon. Bien secouer le siphon avant chaque utilisation. Servir bien frais. Cette espuma accompagne idéalement un vitello tonnato moderne, des carpaccios de veau ou des amuse-bouches gastronomiques.',NULL,NULL,'2026-08-18 19:31:35','2026-08-18 19:32:27'),(5,'Croquette de parmesan','croquette-de-parmesan',2,3,10,2,NULL,'[\"Sauteuse\", \"3 x 1GN\"]','Préparer et peser tous les ingrédients. Temps de préparation : Mise en place 15 min, Cuisson (béchamel) 20 min, Repos au frais 2 h minimum, Cuisson (friture) 5 min.','Deux croquettes par portion. Persil frit. Citron.',NULL,NULL,NULL,'2026-08-18 19:32:46','2026-08-18 19:33:21'),(6,'Crêpes classiques','crepes-classiques',5,4,10,1,NULL,'[\"Saladier\", \"Fouet\", \"Poêle antiadhésive\", \"Louche\"]','Peser tous les ingrédients. Faire fondre le beurre. Sortir les œufs à température ambiante.',NULL,NULL,NULL,NULL,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(7,'Pappardelle au ragù de canard confit et émulsion de romarin','pappardelle-ragu-canard-confit-emulsion-romarin',8,1,10,2,NULL,'[\"Sauteuse\", \"Casserole\", \"Mixeur plongeant (pour l\'émulsion)\", \"Pinceau (facultatif pour l\'huile parfumée)\"]','Effilocher la cuisse de canard confite. Ciseler les oignons, couper la carotte et le céleri en brunoise. Préparer l\'émulsion de romarin : chauffer la crème avec le romarin, laisser infuser 10 min, mixer et émulsionner au moment du dressage. Temps de préparation : Mise en place 15 min, Cuisson 20 min, Mijoter 2 heures.','Dresser les pappardelle nappées de ragù au centre de l\'assiette. Ajouter l\'émulsion de romarin autour. Décorer avec une pluche de romarin et, si souhaité, quelques copeaux de parmesan.',NULL,NULL,NULL,'2026-08-18 19:36:11','2026-08-18 19:36:52'),(8,'Sauce vin blanc pour poisson','sauce-vin-blanc-pour-poisson',12,2,10,2,NULL,'[\"Casserole\", \"Fouet\", \"Chinois\"]','Ciseler finement les échalotes. Couper le beurre froid en petits morceaux (pour la monter au beurre).',NULL,'Ne jamais faire bouillir après avoir monté au beurre, sous peine de faire trancher la sauce. Servir aussitôt, cette sauce ne se garde pas au chaud.',NULL,NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(9,'Civet de biche','civet-de-biche',4,1,10,3,NULL,'[\"1 grande cocotte en fonte\", \"1 marmite ou sauteuse\", \"1 écumoire\", \"1 couteau de chef\", \"1 planche à découper\", \"1 louche\", \"Ficelle alimentaire\"]','J-1 : mettre la viande en marinade avec le vin, les légumes et les aromates. Filmer et réserver au froid pendant 24 h.','Accompagnements conseillés : pommes de terre vapeur, spaetzle ou pâtes fraîches, purée de céleri, choux rouges braisés, chicon braisé, airelles.','Points de contrôle qualité : viande très fondante, sauce nappante et brillante, goût équilibré (pas trop acide), assaisonnement rectifié en fin de cuisson.',NULL,NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(10,'Coulant au chocolat','coulant-au-chocolat',5,4,10,2,NULL,'[\"Saladier inox\", \"Cul-de-poule\", \"Bain-marie ou micro-ondes\", \"Fouet\", \"Spatule maryse\", \"Balance de précision\", \"Moules individuels (alu, silicone ou céramique)\", \"Four ventilé\", \"Grille de refroidissement\", \"Pinceau (pour beurrer)\"]','Temps de préparation : Mise en place 5 min, Préparation 20 min, Repos appareil 30 min (conseillé), Cuisson 8-10 min (total ± 1h05).','Chantilly, boule de glace vanille, crème anglaise.','Points de contrôle qualité : extérieur cuit avec un léger croûtage, cœur bien coulant, texture moelleuse (pas sèche), servir chaud. Variante resto gastro : insert ganache congelé au centre, ou cœur praliné noisette, ou parfum orange (zeste + Grand Marnier).',NULL,'Appareil cru : 24 h max au frigo. Coulant cuit : à servir immédiatement. Congélation possible de l\'appareil en moules crus — cuisson directe depuis congélation : +2 minutes.','2026-08-18 19:54:06','2026-08-18 19:54:06'),(11,'Saumon gravlax au gin','saumon-gravlax-au-gin',2,3,10,2,NULL,'[\"Gastro 150 mm 1GN\", \"Cul de poule\"]','Désarêter soigneusement à la pince. Conserver la peau. Sécher avec papier absorbant. Mélanger : sel, sucre, poivre, baies roses, zeste. Temps de préparation : Mise en place 5 min, Préparation 5 min, Repos 36 à 48 heures.','Trancher finement, en biais, au couteau lisse. Accompagnements conseillés : sauce moutarde-miel-aneth, pain noir/blinis/focaccia, citron, concombre, pickles d\'oignon rouge.',NULL,NULL,'Filmé serré : 3 à 4 jours à +2/+4°C. Sous vide : 7 à 10 jours.','2026-08-18 19:57:04','2026-08-18 19:57:04'),(12,'Mousse de gorgonzola','mousse-de-gorgonzola',1,3,10,1,'Espuma salée au gorgonzola, à servir en dip ou en accompagnement — recette adaptée et mise à l\'échelle (×2,7) depuis la recette de base iSi (culinary.isi.com), pensée à l\'origine pour un seul siphon de 0,5 L (≈3,7 portions).','[\"Blender ou mixeur plongeant\", \"Tamis fin (ou entonnoir-tamis iSi)\", \"Siphon iSi 0,5 L ou 1 L\", \"Réfrigérateur\"]','Sortir le gorgonzola et le lait à température ambiante pour faciliter le mixage.',NULL,NULL,NULL,NULL,'2026-08-18 20:09:27','2026-08-18 20:09:27'),(13,'Vitello tonnato (cuisson sous vide)','vitello-tonnato-sous-vide',2,3,10,2,'Recette traduite et adaptée depuis diejungskochenundbacken.de (Allemagne) — veau cuit sous vide à basse température, sauce thonnée montée en mayonnaise maison.','[\"Poêle\", \"Chinois ou passoire fine\", \"Machine sous vide + sachets\", \"Mortier et pilon\", \"Fouet ou mixeur (pour la mayonnaise)\", \"Réfrigérateur\"]',NULL,NULL,NULL,NULL,NULL,'2026-08-18 20:27:38','2026-08-18 21:06:57'),(14,'Croquettes de sardines aux piments','croquettes-de-sardines-aux-piments',1,2,20,2,'Recette adaptée depuis delizioso.fr, mise à l\'échelle (×1,67) depuis la recette de base qui donne 12 croquettes. Portions ici = nombre de croquettes, pas de personnes.','[\"3 X 1/2GN\"]',NULL,NULL,NULL,NULL,NULL,'2026-08-18 20:56:03','2026-08-18 21:00:17'),(16,'Sauce au poivre pour viande','sauce-au-poivre-viande',12,1,10,2,NULL,'[\"Sauteuse\", \"Fouet\"]','Ciseler l\'échalote. Concasser grossièrement les grains de poivre.',NULL,'Le flambage au cognac est optionnel mais brûle l\'alcool tout en concentrant l\'arôme — flamber loin de la hotte/éléments inflammables. Ne pas laisser bouillir fort après ajout de la crème, sous peine de la voir trancher.',NULL,NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(17,'Sauce aux champignons pour viande','sauce-aux-champignons-viande',12,1,10,1,NULL,'[\"Sauteuse\", \"Fouet\"]','Émincer les champignons de Paris. Ciseler l\'échalote et le persil.',NULL,NULL,NULL,NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(18,'Chou-fleur bang bang','chou-fleur-bang-bang',10,1,10,1,'Recette traduite et mise à l\'échelle (×2,5) depuis thetravelpalate.com (base 4 portions) — chou-fleur pané léger (fécule + épices) cuit à l\'air fryer, glacé au miel-sriracha, servi avec une sauce bang bang (mayo-sriracha-miel).','[\"Four\"]','Couper le chou-fleur en fleurettes, rincer et bien sécher. Préchauffer four 200°C.',NULL,NULL,NULL,NULL,'2026-08-18 21:29:21','2026-08-18 21:33:43'),(19,'Arancini à la sicilienne, ragù et petits pois','arancini-a-la-sicilienne',2,1,10,2,'Recette adaptée depuis galbani.fr, mise à l\'échelle (×2) depuis la recette de base pour 5 personnes.','[]',NULL,NULL,NULL,NULL,NULL,'2026-08-18 21:38:17','2026-08-18 21:43:29'),(20,'Le véritable tiramisu','le-veritable-tiramisu',5,4,16,1,'Recette adaptée depuis galbani.fr, mise à l\'échelle (×4) depuis la base 4 personnes / 250 g de mascarpone, pour atteindre 1 kg de mascarpone (16 personnes).','[\"Saladier\", \"Fouet\", \"Spatule\", \"Plat de service ou verrines\", \"Réfrigérateur\"]','Séparer les blancs des jaunes d\'œufs. Préparer le café fort et le laisser refroidir.',NULL,NULL,NULL,'Réfrigérer minimum 4 heures avant de servir, idéalement 24h.','2026-08-18 21:40:56','2026-08-18 21:40:56'),(21,'Risotto aux champignons et à la saucisse','risotto-champignons-saucisse',9,1,10,2,'Recette adaptée depuis galbani.fr, mise à l\'échelle (×2,5) depuis la base 4 personnes.','[\"Casserole\", \"Cuillère en bois\", \"Râpe\", \"Couteau et planche à découper\"]','Retirer le boyau de la saucisse et émietter la chair. Nettoyer et couper les girolles en petits morceaux. Éplucher et ciseler l\'échalote. Préparer le bouillon : dissoudre les cubes dans 1,25 L d\'eau chaude.',NULL,NULL,NULL,NULL,'2026-08-18 21:47:02','2026-08-18 21:47:02'),(22,'Pavés de pommes de terre','paves-de-pommes-de-terre',10,1,10,2,'Accompagnement viande. Recette adaptée depuis pankaj-blog.com, mise à l\'échelle (×2,5) depuis la base 4 personnes.','[\"Moule à cake (ou plaque type terrine)\", \"Papier cuisson\", \"Papier aluminium\", \"Planche à découper\", \"Couteau (mandoline conseillée)\", \"Poêle\", \"Four\"]','Éplucher les pommes de terre, couper les extrémités, trancher finement (mandoline conseillée). Chemiser le moule de papier cuisson.',NULL,NULL,NULL,NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(23,'Poulet popcorn taïwanais','poulet-popcorn-taiwanais',1,1,10,2,'Recette traduite et mise à l\'échelle (×2,5) depuis christieathome.com (base 4 portions en accompagnement).','[\"Wok ou friteuse\", \"Thermomètre de cuisson\", \"Planche à découper\", \"Couteau\", \"Saladiers\", \"Écumoire\", \"Grille de refroidissement\"]','Couper le poulet en morceaux d\'environ 4 cm. Préparer la marinade et le mélange d\'épices séparément.',NULL,NULL,NULL,NULL,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(24,'Pad thaï au poulet','pad-thai-au-poulet',8,1,10,2,'Recette traduite et mise à l\'échelle (×5) depuis christieathome.com (base 2 portions).','[\"Grand wok antiadhésif\", \"Passoire fine (pour le tamarin)\", \"Verres/cuillères doseurs\", \"Planche à découper et couteau\", \"Grande casserole (5 L)\"]','Trancher finement le poulet et l\'assaisonner de sel. Faire tremper la pâte de tamarin dans l\'eau bouillante 3 minutes, puis presser/masser jusqu\'à dissolution et passer au chinois. Faire tremper les nouilles de riz dans l\'eau bouillante 2 à 4 minutes (ou eau tiède 15 min), égoutter aussitôt.',NULL,NULL,NULL,'Se conserve jusqu\'à 4 jours au réfrigérateur dans un contenant hermétique. Réchauffer 2-3 min au micro-ondes ou à la poêle avec un peu d\'eau. Congélation déconseillée (texture des nouilles altérée).','2026-08-18 22:23:20','2026-08-18 22:24:46'),(26,'Ballottine de volaille fermière aux champignons forestiers','ballottine-de-volaille-fermiere-aux-champignons-forestiers',4,1,10,3,'Adaptation professionnelle pour 10 couverts de la recette \"Ballottine de volaille fermière aux champignons forestiers\" (source : Popote et Fleur de Sel) — filets de volaille fermière farcis d\'une duxelles de champignons des bois, pochés puis nappés d\'une sauce suprême liée aux jaunes d\'oeufs, accompagnés d\'une purée de pommes de terre à la ciboulette. Quantités doublées à partir de la base 5 portions de la recette d\'origine.','[\"Planche à découper\", \"Batteur à viande (attendrisseur)\", \"Film alimentaire\", \"Casseroles\", \"Fouet\", \"Poêle\", \"Presse-purée ou moulin à légumes\", \"Thermomètre sonde\"]','Préparer le fond de volaille et le laisser refroidir. Éplucher et émincer échalote et oignon. Nettoyer et tailler les champignons des bois. Sortir les filets de volaille, les ouvrir en portefeuille et les attendrir légèrement. Éplucher les pommes de terre.','Trancher la ballottine en biseau sur assiette chaude, napper de sauce suprême, quenelle de purée à la ciboulette, pluches d\'herbes fraîches.','Bien serrer le film autour de chaque ballottine pour un pochage régulier et une forme nette au tranchage. Ne jamais faire bouillir la sauce après incorporation des jaunes d\'oeufs (risque de tranchage).','Respecter la chaîne du froid sur la volaille crue. Contrôler la cuisson à coeur des ballottines à la sonde (≥ 63°C). En cas de production à l\'avance, refroidir rapidement (cellule) avant stockage, ne pas rompre la chaîne du froid entre pochage et remise en température au moment du service.','Ballottines pochées et sauce : 48h maximum au réfrigérateur (0-4°C), en contenants hermétiques séparés. Purée : 24-48h. Remise en température à coeur avant service.','2026-09-07 19:17:16','2026-09-07 19:17:16'),(27,'Cabillaud marbré & légumes verts','cabillaud-marbre-legumes-verts',3,2,10,3,'Filet de cabillaud roulé en ballottine marbrée de poudre de nori, cuit à basse température, accompagné d\'une purée de petits pois onctueuse et d\'une garniture de légumes verts de printemps (fèves, petits pois, mini-poireaux).','[\"Casserole\", \"Thermomètre sonde\", \"Film alimentaire\", \"Mixeur / blender\", \"Poêle\", \"Pochoir pour dressage\", \"Bain d\'eau glacée\"]','Trancher le cabillaud, mixer la poudre de nori, écosser petits pois et fèves, effiler les mini-poireaux, préparer un bain d\'eau glacée.','Étaler la purée de petits pois au pochoir sur l\'assiette. Disposer trois tranches de cabillaud marbré au centre. Parsemer de petits pois et fèves, décorer de mini-poireaux tranchés.','Contrôler la température à cœur du cabillaud au thermomètre sonde pour garantir une cuisson parfaite à 52°C sans dessécher le poisson.','Respecter la chaîne du froid pour le poisson cru avant cuisson. Surveiller la cuisson (52°C à cœur) au thermomètre sonde. Refroidir rapidement la ballottine avant tranchage. Servir immédiatement après dressage.','Ballottine de cabillaud cuite : conserver au frais (0-4°C), maximum 24h avant service. Purée et légumes : conserver séparément au frais, à consommer sous 24h.','2026-09-09 16:46:32','2026-09-09 16:46:32'),(28,'Sauce tartare','sauce-tartare',12,3,20,1,'Sauce froide à base de mayonnaise maison, relevée d\'herbes fraîches, câpres et cornichons. Accompagnement classique des poissons et fritures.','[\"Bol\", \"Fouet\", \"Couteau\", \"Planche à découper\"]','Hacher finement les herbes (cerfeuil, estragon, ciboulette, persil), les câpres et les cornichons. Séparer les jaunes d\'oeufs.',NULL,'Incorporer l\'huile en filet fin et fouetter sans interruption pour éviter que la mayonnaise ne tranche. Rectifier l\'assaisonnement juste avant de mélanger les herbes.','Sauce à base d\'oeufs crus : préparer au dernier moment et conserver au frais (0-4°C), consommation rapide recommandée (24h max).','Conserver au frais (0-4°C) dans un contenant hermétique, maximum 24h.','2026-09-09 16:49:44','2026-09-09 16:49:44'),(29,'Fish & Chips de Cabillaud','fish-chips-de-cabillaud',3,2,10,2,'Bâtonnets de cabillaud en beignet à la bière, frites maison, un classique britannique revisité.','[\"Saladier\", \"Fouet\", \"Friteuse\", \"Papier absorbant\"]','Tamiser la farine, préparer la pâte à beignet et la réserver au frais. Éplucher et tailler les pommes de terre en frites, rincer et sécher. Tailler le cabillaud en bâtonnets.','Dresser les bâtonnets de cabillaud frit et les frites ensemble, servir immédiatement bien chaud.','Bien égoutter et sécher les pommes de terre avant friture pour une texture croustillante. Laisser reposer la pâte au moins 1h au frais pour qu\'elle adhère mieux au poisson.','Respecter la chaîne du froid pour le cabillaud cru et la pâte avant friture. Contrôler la température de l\'huile de friture. Servir immédiatement après cuisson.','Pâte à beignet crue : conserver au frais (0-4°C) jusqu\'à utilisation, maximum 24h. Ne se conserve pas une fois frit, à consommer immédiatement.','2026-09-09 16:50:32','2026-09-09 16:50:32'),(30,'Confit de Bœuf de 7H','confit-de-boeuf-de-7h',4,1,10,2,'Paleron de bœuf braisé 7 heures à basse température jusqu\'à effilochage, dressé en cercle sur une purée de pommes de terre, gratiné au comté, accompagné de carottes fanes rôties et de son jus réduit.','[\"Cocotte\", \"Four\", \"Presse-purée / moulin à légumes\", \"Plaque de cuisson\", \"Cercle à dresser\", \"Chinois\"]','Parer et assaisonner le paleron. Émincer oignons, poireau, carottes. Éplucher l\'ail. Éplucher les pommes de terre. Laver les carottes fanes.','Dresser la viande effilochée dans un cercle, napper de jus réduit, ajouter une couche de purée lisse, gratiner à la chapelure et au comté. Servir chaud avec les carottes fanes rôties et le reste du jus.','Cuire la viande la veille pour gagner du temps et améliorer le fondant après repos. Réchauffer doucement avec le jus réduit le jour du service.','Respecter la chaîne du froid pour la viande crue. Vérifier la température à cœur en fin de cuisson (viande qui s\'effiloche facilement). Refroidir rapidement après cuisson si conservation avant service.','Viande effilochée et jus réduit : conserver au frais (0-4°C), maximum 72h, ou congeler. Purée : à consommer sous 24h.','2026-09-09 17:57:29','2026-09-09 17:57:29'),(31,'Pâté Croûte aux Shitakés','pate-croute-aux-shitakes',2,1,8,3,'Pâté croûte traditionnel garni d\'une farce de porc aux shitakés et cognac, accompagné d\'une jardinière de légumes (pickles d\'oignon rouge, purée de carotte, rouleaux de courgette).','[\"Batteur\", \"Hachoir à viande\", \"Moule à pâté croûte\", \"Thermomètre sonde\", \"Papier aluminium\", \"Réfrigérateur\"]','Préparer la pâte la veille (repos une nuit). Préparer la farce la veille (repos une nuit). Éplucher et tailler les légumes de la jardinière.','Dresser harmonieusement le pâté croûte tranché avec la jardinière (pickles d\'oignon rouge, purée de carotte, rouleaux de courgette), ajouter une pointe de fleur de sel à l\'envoi.','Respecter les temps de repos d\'une nuit pour la pâte et pour la farce, ils sont essentiels à la tenue et au goût du pâté croûte.','Respecter la chaîne du froid pour la viande crue et la farce. Contrôler la cuisson à la sonde (50°C à cœur). Refroidir le pâté une nuit complète avant découpe.','Pâté croûte cuit : conserver au frais (0-4°C), maximum 5 jours. Jardinière (pickles, purée) : conserver séparément au frais, à consommer sous 48h.','2026-09-09 18:04:03','2026-09-09 18:04:03'),(32,'Poke bowl saumon mariné','poke-bowl-saumon-marine',7,2,10,2,'Grand bol de riz complet avec des dés de saumon marinés au soja et citron vert, une tombée de pousses d\'épinard et des bâtonnets de concombre et betterave, dressage aux graines de grenadille et sésame.','[\"Couteau à désarêter\", \"Grande casserole\", \"Passoire\", \"Poêle\", \"Bols individuels\"]','Placer les pavés de saumon au congélateur 5 min pour faciliter la taille. Éplucher concombre et betterave. Rincer les pousses d\'épinard.','Dans un grand bol individuel, déposer un fond de riz complet. Ajouter les dés de saumon d\'un côté, les épinards de l\'autre, puis les bâtonnets de concombre et betterave. Ouvrir les fruits de la passion, déposer les graines dans chaque bol. Saupoudrer de graines de sésame et arroser d\'un peu de marinade. Servir avec un quartier de citron vert.','Le riz complet, excellent pour la santé, demande une cuisson longue — possibilité d\'utiliser une variété précuite pour gagner du temps.','Saumon consommé mariné/cru : respecter la chaîne du froid, conserver la marinade au frais dès sa préparation, ne pas dépasser 24h de marinade.','Saumon mariné : conserver au frais (0-4°C), à consommer sous 24h. Riz et légumes taillés : à consommer sous 24h également, conserver séparément au frais.','2026-09-09 19:48:17','2026-09-09 19:48:17'),(33,'Mille-feuille fraise et brioche, coulis fraises et menthe','mille-feuille-fraise-et-brioche-coulis-fraises-et-menthe',5,4,10,2,'Mille-feuille à base de crème mascarpone et chocolat blanc, feuillets de brioche caramélisés au sucre glace, fraises fraîches, accompagné d\'un coulis fraise-menthe.','[\"Rouleau à pâtisserie\", \"Plaque à pâtisserie\", \"Four (mode gril)\", \"Batteur / fouet\", \"Mixeur\", \"Poche à douille\", \"Bol\"]','Peser les ingrédients. Préchauffer le four à 180°C. Réserver un bol et la crème liquide au réfrigérateur.','Étaler de la confiture sur 2/3 des tranches de brioche, réaliser une jolie quenelle de mousse chocolat blanc, ranger les cubes de fraises autour. Monter 2 étages et terminer par une feuille de brioche. Poser le mille-feuille au centre d\'une assiette et ajouter un trait de coulis.','Réaliser le montage juste avant la dégustation pour éviter que la brioche ne soit détrempée.','Crème mascarpone/chantilly à base de produits laitiers frais : conserver au frais dès la préparation, monter juste avant service.','Éléments préparés (crème, coulis, feuilles de brioche caramélisées) : conserver séparément au frais, à consommer sous 24h. Ne pas monter le dessert à l\'avance.','2026-09-09 19:51:05','2026-09-09 19:51:05');
/*!40000 ALTER TABLE `fiche_techniques` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `friteuses`
--

DROP TABLE IF EXISTS `friteuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `friteuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duree_vie_jours` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `friteuses`
--

LOCK TABLES `friteuses` WRITE;
/*!40000 ALTER TABLE `friteuses` DISABLE KEYS */;
INSERT INTO `friteuses` VALUES (1,'Friteuse (exemple)',4,'2026-07-30 17:21:42','2026-09-07 17:34:17');
/*!40000 ALTER TABLE `friteuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredient_categories`
--

DROP TABLE IF EXISTS `ingredient_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredient_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ingredient_categories_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredient_categories`
--

LOCK TABLES `ingredient_categories` WRITE;
/*!40000 ALTER TABLE `ingredient_categories` DISABLE KEYS */;
INSERT INTO `ingredient_categories` VALUES (1,'Céréales & farines','cereales-farines','#D97706','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Produits laitiers','produits-laitiers','#38BDF8','2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,'Œufs','oeufs','#FACC15','2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,'Fruits secs & oléagineux','fruits-secs-oleagineux','#92400E','2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,'Poissons & fruits de mer','poissons-fruits-de-mer','#0EA5E9','2026-07-30 17:21:42','2026-07-30 17:21:42'),(6,'Viandes','viandes','#DC2626','2026-07-30 17:21:42','2026-07-30 17:21:42'),(7,'Légumes','legumes','#22C55E','2026-07-30 17:21:42','2026-07-30 17:21:42'),(8,'Fruits','fruits','#F43F5E','2026-07-30 17:21:42','2026-07-30 17:21:42'),(9,'Condiments & épices','condiments-epices','#EA580C','2026-07-30 17:21:42','2026-07-30 17:21:42'),(10,'Boissons & vins','boissons-vins','#7C3AED','2026-07-30 17:21:42','2026-07-30 17:21:42');
/*!40000 ALTER TABLE `ingredient_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ingredient_category_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ingredients_slug_unique` (`slug`),
  KEY `ingredients_ingredient_category_id_foreign` (`ingredient_category_id`),
  CONSTRAINT `ingredients_ingredient_category_id_foreign` FOREIGN KEY (`ingredient_category_id`) REFERENCES `ingredient_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=351 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredients`
--

LOCK TABLES `ingredients` WRITE;
/*!40000 ALTER TABLE `ingredients` DISABLE KEYS */;
INSERT INTO `ingredients` VALUES (1,1,'Farine de blé','farine-de-ble','kg',1.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,1,'Farine de blé complète','farine-de-ble-complete','kg',1.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,1,'Farine de seigle','farine-de-seigle','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,1,'Farine de sarrasin','farine-de-sarrasin','kg',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,1,'Farine de maïs','farine-de-mais','kg',1.90,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(6,1,'Farine de riz','farine-de-riz','kg',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(7,1,'Farine de châtaigne','farine-de-chataigne','kg',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(8,1,'Semoule de blé','semoule-de-ble','kg',1.60,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(9,1,'Riz basmati','riz-basmati','kg',2.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(10,1,'Riz rond','riz-rond','kg',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(11,1,'Riz complet','riz-complet','kg',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(12,1,'Pâtes (spaghetti)','pates-spaghetti','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(13,1,'Pâtes (penne)','pates-penne','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(14,1,'Couscous','couscous','kg',1.90,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(15,1,'Quinoa','quinoa','kg',5.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(16,1,'Boulgour','boulgour','kg',2.60,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(17,1,'Polenta','polenta','kg',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(18,1,'Flocons d\'avoine','flocons-davoine','kg',2.30,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(19,1,'Levure boulangère','levure-boulangere','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(20,1,'Levure chimique','levure-chimique','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(21,1,'Bicarbonate de soude','bicarbonate-de-soude','kg',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(22,1,'Chapelure','chapelure','kg',2.10,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(23,1,'Fécule de maïs','fecule-de-mais','kg',2.40,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(24,1,'Pain de mie','pain-de-mie','kg',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(25,1,'Baguette de pain','baguette-de-pain','pièce',1.10,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(26,2,'Beurre','beurre','kg',6.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(27,2,'Beurre doux','beurre-doux','kg',6.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(28,2,'Crème fraîche épaisse','creme-fraiche-epaisse','L',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(29,2,'Crème liquide entière','creme-liquide-entiere','L',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(30,2,'Lait entier','lait-entier','L',1.10,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(31,2,'Lait demi-écrémé','lait-demi-ecreme','L',1.05,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(32,2,'Lait écrémé','lait-ecreme','L',1.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(33,2,'Lait concentré non sucré','lait-concentre-non-sucre','L',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(34,2,'Yaourt nature','yaourt-nature','kg',2.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(35,2,'Fromage blanc','fromage-blanc','kg',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(36,2,'Mascarpone','mascarpone','kg',7.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(37,2,'Ricotta','ricotta','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(38,2,'Gruyère râpé','gruyere-rape','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(39,2,'Emmental râpé','emmental-rape','kg',10.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(40,2,'Parmesan','parmesan','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(41,2,'Mozzarella','mozzarella','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(42,2,'Chèvre frais','chevre-frais','kg',11.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(43,2,'Comté','comte','kg',16.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(44,2,'Camembert','camembert','pièce',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(45,2,'Roquefort','roquefort','kg',20.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(46,2,'Feta','feta','kg',8.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(47,2,'Crème épaisse allégée','creme-epaisse-allegee','L',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(48,2,'Babeurre','babeurre','L',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(49,2,'Petit-suisse','petit-suisse','kg',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(50,2,'Beurre clarifié (ghee)','beurre-clarifie-ghee','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(51,3,'Oeufs','oeufs','pièce',0.30,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(52,3,'Oeufs de caille','oeufs-de-caille','pièce',0.25,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(53,3,'Blancs d\'oeufs liquides','blancs-doeufs-liquides','L',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(54,3,'Jaunes d\'oeufs liquides','jaunes-doeufs-liquides','L',5.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(55,3,'Oeufs durs','oeufs-durs','pièce',0.40,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(56,4,'Amandes effilées','amandes-effilees','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(57,4,'Amandes entières','amandes-entieres','kg',11.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(58,4,'Amandes en poudre','amandes-en-poudre','kg',13.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(59,4,'Noisettes','noisettes','kg',13.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(60,4,'Noix','noix','kg',12.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(61,4,'Noix de cajou','noix-de-cajou','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(62,4,'Pistaches','pistaches','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(63,4,'Pignons de pin','pignons-de-pin','kg',35.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(64,4,'Cacahuètes','cacahuetes','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(65,4,'Beurre de cacahuète','beurre-de-cacahuete','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(66,4,'Graines de tournesol','graines-de-tournesol','kg',5.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(67,4,'Graines de courge','graines-de-courge','kg',7.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(68,4,'Graines de sésame','graines-de-sesame','kg',6.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(69,4,'Graines de lin','graines-de-lin','kg',5.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(70,4,'Graines de chia','graines-de-chia','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(71,4,'Raisins secs','raisins-secs','kg',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(72,4,'Abricots secs','abricots-secs','kg',7.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(73,4,'Dattes','dattes','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(74,4,'Figues sèches','figues-seches','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(75,4,'Noix de coco râpée','noix-de-coco-rapee','kg',6.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(76,5,'Saumon','saumon','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(77,5,'Cabillaud','cabillaud','kg',16.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(78,5,'Thon frais','thon-frais','kg',20.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(79,5,'Thon en boîte','thon-en-boite','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(80,5,'Truite','truite','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(81,5,'Bar (loup)','bar-loup','kg',22.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(82,5,'Dorade','dorade','kg',19.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(83,5,'Sole','sole','kg',28.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(84,5,'Merlan','merlan','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(85,5,'Colin (lieu noir)','colin-lieu-noir','kg',13.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(86,5,'Sardine','sardine','kg',7.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(87,5,'Maquereau','maquereau','kg',8.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(88,5,'Anchois','anchois','kg',15.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(89,5,'Hareng','hareng','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(90,5,'Flétan','fletan','kg',25.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(91,5,'Anguille','anguille','kg',24.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(92,5,'Crevettes','crevettes','kg',22.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(93,5,'Gambas','gambas','kg',26.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(94,5,'Langoustines','langoustines','kg',32.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(95,5,'Homard','homard','kg',45.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(96,5,'Crabe','crabe','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(97,5,'Moules','moules','kg',5.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(98,5,'Huîtres','huitres','pièce',1.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(99,5,'Coquilles Saint-Jacques','coquilles-saint-jacques','kg',30.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(100,5,'Calamars','calamars','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(101,6,'Boeuf haché','boeuf-hache','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(102,6,'Entrecôte de boeuf','entrecote-de-boeuf','kg',22.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(103,6,'Bavette de boeuf','bavette-de-boeuf','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(104,6,'Rôti de boeuf','roti-de-boeuf','kg',16.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(105,6,'Paleron de boeuf (bourguignon)','paleron-de-boeuf-bourguignon','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(106,6,'Filet de boeuf','filet-de-boeuf','kg',32.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(107,6,'Joue de boeuf','joue-de-boeuf','kg',13.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(108,6,'Escalope de veau','escalope-de-veau','kg',20.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(109,6,'Blanquette de veau','blanquette-de-veau','kg',17.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(110,6,'Rôti de veau','roti-de-veau','kg',19.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(111,6,'Filet mignon de porc','filet-mignon-de-porc','kg',11.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(112,6,'Côtes de porc','cotes-de-porc','kg',9.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(113,6,'Échine de porc','echine-de-porc','kg',8.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(114,6,'Lardons','lardons','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(115,6,'Jambon blanc','jambon-blanc','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(116,6,'Jambon sec','jambon-sec','kg',25.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(117,6,'Saucisses de Toulouse','saucisses-de-toulouse','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(118,6,'Chorizo','chorizo','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(119,6,'Saucisson sec','saucisson-sec','kg',20.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(120,6,'Bacon','bacon','kg',11.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(121,6,'Pancetta','pancetta','kg',15.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(122,6,'Rillettes','rillettes','kg',10.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(123,6,'Boudin noir','boudin-noir','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(124,6,'Gigot d\'agneau','gigot-dagneau','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(125,6,'Côtelettes d\'agneau','cotelettes-dagneau','kg',20.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(126,6,'Épaule d\'agneau','epaule-dagneau','kg',15.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(127,6,'Poulet entier','poulet-entier','kg',6.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(128,6,'Blanc de poulet','blanc-de-poulet','kg',10.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(129,6,'Cuisse de poulet','cuisse-de-poulet','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(130,6,'Escalope de dinde','escalope-de-dinde','kg',9.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(131,6,'Magret de canard','magret-de-canard','kg',22.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(132,6,'Confit de canard','confit-de-canard','kg',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(133,6,'Foie gras','foie-gras','kg',55.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(134,6,'Lapin','lapin','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(135,6,'Caille','caille','pièce',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(136,7,'Céleri branche','celeri-branche','kg',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(137,7,'Céleri-rave','celeri-rave','kg',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(138,7,'Pomme de terre','pomme-de-terre','kg',1.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(139,7,'Carotte','carotte','kg',1.10,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(140,7,'Oignon','oignon','kg',1.30,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(141,7,'Échalote','echalote','kg',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(142,7,'Ail','ail','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(143,7,'Poireau','poireau','kg',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(144,7,'Tomate','tomate','kg',2.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(145,7,'Concombre','concombre','pièce',1.80,'2026-07-30 17:21:42','2026-09-09 19:52:46'),(146,7,'Courgette','courgette','kg',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(147,7,'Aubergine','aubergine','kg',2.60,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(148,7,'Poivron rouge','poivron-rouge','kg',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(149,7,'Poivron vert','poivron-vert','kg',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(150,7,'Champignon de Paris','champignon-de-paris','kg',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(151,7,'Cèpes','cepes','kg',25.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(152,7,'Chou blanc','chou-blanc','kg',1.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(153,7,'Chou-fleur','chou-fleur','kg',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(154,7,'Brocoli','brocoli','kg',2.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(155,7,'Chou rouge','chou-rouge','kg',1.70,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(156,7,'Chou de Bruxelles','chou-de-bruxelles','kg',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(157,7,'Épinard','epinard','kg',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(158,7,'Salade verte','salade-verte','pièce',1.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(159,7,'Roquette','roquette','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(160,7,'Mâche','mache','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(161,7,'Endive','endive','kg',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(162,7,'Betterave','betterave','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(163,7,'Navet','navet','kg',1.60,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(164,7,'Radis','radis','botte',1.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(165,7,'Petit pois','petit-pois','kg',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(166,7,'Haricot vert','haricot-vert','kg',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(167,7,'Fève','feve','kg',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(168,7,'Asperge verte','asperge-verte','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(169,7,'Artichaut','artichaut','pièce',1.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(170,7,'Fenouil','fenouil','kg',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(171,7,'Courge butternut','courge-butternut','kg',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(172,7,'Potiron','potiron','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(173,7,'Maïs doux','mais-doux','kg',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(174,7,'Oignon grelot','oignon-grelot','kg',3.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(175,7,'Ciboulette','ciboulette','botte',1.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(176,7,'Persil','persil','botte',1.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(177,7,'Basilic','basilic','botte',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(178,7,'Coriandre fraîche','coriandre-fraiche','botte',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(179,7,'Piment fort','piment-fort','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(180,7,'Gingembre frais','gingembre-frais','kg',5.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(181,8,'Pomme','pomme','kg',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(182,8,'Poire','poire','kg',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(183,8,'Banane','banane','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(184,8,'Orange','orange','kg',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(185,8,'Citron','citron','kg',2.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(186,8,'Citron vert','citron-vert','kg',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(187,8,'Pamplemousse','pamplemousse','kg',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(188,8,'Mandarine','mandarine','kg',2.60,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(189,8,'Ananas','ananas','pièce',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(190,8,'Mangue','mangue','pièce',2.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(191,8,'Kiwi','kiwi','kg',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(192,8,'Fraise','fraise','kg',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(193,8,'Framboise','framboise','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(194,8,'Myrtille','myrtille','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(195,8,'Mûre','mure','kg',10.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(196,8,'Cerise','cerise','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(197,8,'Abricot','abricot','kg',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(198,8,'Pêche','peche','kg',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(199,8,'Nectarine','nectarine','kg',3.60,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(200,8,'Prune','prune','kg',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(201,8,'Raisin blanc','raisin-blanc','kg',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(202,8,'Raisin noir','raisin-noir','kg',4.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(203,8,'Melon','melon','pièce',2.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(204,8,'Pastèque','pasteque','kg',1.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(205,8,'Grenade','grenade','pièce',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(206,8,'Figue fraîche','figue-fraiche','kg',7.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(207,8,'Litchi','litchi','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(208,8,'Papaye','papaye','pièce',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(209,8,'Fruit de la passion','fruit-de-la-passion','pièce',1.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(210,8,'Rhubarbe','rhubarbe','kg',3.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(211,9,'Moutarde de Dijon','moutarde-de-dijon','kg',4.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(212,9,'Sauce soja','sauce-soja','L',3.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(213,9,'Sel fin','sel-fin','kg',0.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(214,9,'Poivre noir','poivre-noir','kg',15.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(215,9,'Poivre blanc','poivre-blanc','kg',16.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(216,9,'Paprika','paprika','kg',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(217,9,'Curcuma','curcuma','kg',10.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(218,9,'Cumin','cumin','kg',11.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(219,9,'Cannelle','cannelle','kg',14.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(220,9,'Muscade','muscade','kg',20.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(221,9,'Curry','curry','kg',13.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(222,9,'Piment d\'Espelette','piment-despelette','kg',30.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(223,9,'Herbes de Provence','herbes-de-provence','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(224,9,'Laurier','laurier','kg',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(225,9,'Thym','thym','kg',9.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(226,9,'Romarin','romarin','kg',9.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(227,9,'Origan','origan','kg',8.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(228,9,'Vanille (gousse)','vanille-gousse','pièce',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(229,9,'Huile d\'olive','huile-dolive','L',7.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(230,9,'Huile de tournesol','huile-de-tournesol','L',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(231,9,'Huile de colza','huile-de-colza','L',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(232,9,'Vinaigre balsamique','vinaigre-balsamique','L',6.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(233,9,'Vinaigre de cidre','vinaigre-de-cidre','L',3.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(234,9,'Ketchup','ketchup','kg',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(235,9,'Mayonnaise','mayonnaise','kg',4.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(236,9,'Sauce Worcestershire','sauce-worcestershire','L',8.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(237,9,'Miel','miel','kg',9.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(238,9,'Sucre blanc','sucre-blanc','kg',1.10,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(239,9,'Sucre roux','sucre-roux','kg',1.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(240,9,'Cassonade','cassonade','kg',1.80,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(241,10,'Vin blanc','vin-blanc','L',5.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(242,10,'Vin rouge','vin-rouge','L',5.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(243,10,'Vin rosé','vin-rose','L',5.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(244,10,'Champagne','champagne','L',25.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(245,10,'Porto','porto','L',12.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(246,10,'Cognac','cognac','L',30.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(247,10,'Rhum brun','rhum-brun','L',18.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(248,10,'Bière blonde','biere-blonde','L',2.50,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(249,10,'Cidre brut','cidre-brut','L',3.00,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(250,10,'Jus de pomme','jus-de-pomme','L',2.20,'2026-07-30 17:21:42','2026-07-30 17:21:42'),(251,2,'Crème 40%','creme-40','L',NULL,'2026-08-18 19:24:31','2026-08-18 21:53:11'),(252,6,'Lard fumé','lard-fume','kg',NULL,'2026-08-18 19:24:31','2026-08-18 21:53:11'),(253,2,'Cheddar','cheddar','kg',NULL,'2026-08-18 19:27:30','2026-08-18 21:53:11'),(254,7,'Jalapeños','jalapenos','pièce',NULL,'2026-08-18 19:27:30','2026-08-18 21:53:11'),(255,9,'Ail moulu','ail-moulu','c. à café',NULL,'2026-08-18 19:27:30','2026-08-18 21:53:11'),(256,9,'Oignon en poudre','oignon-en-poudre','c. à café',NULL,'2026-08-18 19:27:30','2026-08-18 21:53:11'),(257,9,'Huile de friture','huile-de-friture','L',4.50,'2026-08-18 19:27:30','2026-08-18 21:22:57'),(258,6,'Fond de veau','fond-de-veau','L',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(259,9,'Câpres','capres','g',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(260,8,'Jus de citron','jus-de-citron','g',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(261,5,'Filet d\'anchois','filet-danchois','pièce',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(262,3,'Jaune d\'œuf dur','jaune-doeuf-dur','pièce',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(263,9,'Poivre vert granulé','poivre-vert-granule','g',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(264,9,'Proespuma Frio','proespuma-frio','g',NULL,'2026-08-18 19:31:18','2026-08-18 21:53:11'),(265,NULL,'Cartouches pour siphon','cartouches-pour-siphon','pièce',NULL,'2026-08-18 19:31:18','2026-08-18 19:31:18'),(266,3,'Blanc d\'œuf','blanc-doeuf','pièce',NULL,'2026-08-18 19:32:36','2026-08-18 21:53:11'),(267,9,'Pappardelle fraîches','pappardelle-fraiches','kg',NULL,'2026-08-18 19:35:58','2026-08-18 21:50:38'),(268,7,'Gousse d\'ail','gousse-dail','gousse',NULL,'2026-08-18 19:35:58','2026-08-18 21:53:11'),(269,7,'Romarin frais','romarin-frais','branche',NULL,'2026-08-18 19:35:58','2026-08-18 21:53:11'),(270,5,'Fumet de poisson','fumet-de-poisson','L',NULL,'2026-08-18 19:37:45','2026-08-18 21:53:11'),(271,6,'Biche (viande)','biche-viande','kg',NULL,'2026-08-18 19:41:48','2026-08-18 21:53:11'),(272,9,'Laurier (feuille)','laurier-feuille','feuille',NULL,'2026-08-18 19:41:48','2026-08-18 21:53:11'),(273,9,'Thym (branche)','thym-branche','branche',NULL,'2026-08-18 19:41:48','2026-08-18 21:50:06'),(274,9,'Poivre noir en grains','poivre-noir-en-grains','grain',NULL,'2026-08-18 19:41:48','2026-08-18 21:53:11'),(275,9,'Clou de girofle','clou-de-girofle','clou',NULL,'2026-08-18 19:41:49','2026-08-18 21:53:11'),(276,9,'Chocolat noir 70%','chocolat-noir-70','kg',NULL,'2026-08-18 19:53:30','2026-08-18 21:53:11'),(277,3,'Jaune d\'œuf','jaune-doeuf','pièce',NULL,'2026-08-18 19:53:30','2026-08-18 21:53:11'),(278,9,'Cacao en poudre','cacao-en-poudre','kg',NULL,'2026-08-18 19:53:30','2026-08-18 21:53:11'),(279,9,'Gros sel','gros-sel','kg',2.90,'2026-08-18 19:56:51','2026-08-18 21:53:11'),(280,10,'Gin sec','gin-sec','L',62.50,'2026-08-18 19:56:51','2026-08-18 21:53:11'),(281,9,'Baie rose','baie-rose','c. à café',0.05,'2026-08-18 19:56:51','2026-08-18 21:53:11'),(282,9,'Poivre noir moulu','poivre-noir-moulu','c. à café',0.05,'2026-08-18 19:56:51','2026-08-18 21:53:11'),(283,7,'Aneth','aneth','bouquet',2.75,'2026-08-18 19:56:51','2026-08-18 21:53:11'),(284,9,'Zeste de citron jaune','zeste-de-citron-jaune','pièce',2.15,'2026-08-18 19:56:51','2026-08-18 21:49:30'),(285,2,'Gorgonzola','gorgonzola','kg',NULL,'2026-08-18 20:09:16','2026-08-18 21:53:11'),(286,6,'Noix de veau','noix-de-veau','kg',20.00,'2026-08-18 20:27:03','2026-08-18 20:31:20'),(287,9,'Baies de piment de la Jamaïque','baies-piment-jamaique','grain',NULL,'2026-08-18 20:27:03','2026-08-18 21:53:11'),(288,5,'Sardines aux piments (boîte)','sardines-aux-piments-boite','kg',NULL,'2026-08-18 20:55:36','2026-08-18 21:53:11'),(289,8,'Jus de citron vert','jus-de-citron-vert','g',NULL,'2026-08-18 20:55:36','2026-08-18 21:53:11'),(290,9,'Pili pili','pili-pili','gr',NULL,'2026-08-18 20:55:36','2026-08-18 21:53:11'),(291,9,'Sauce sriracha','sauce-sriracha','L',NULL,'2026-08-18 21:29:04','2026-08-18 21:50:20'),(292,9,'Paprika fumé','paprika-fume','c. à café',NULL,'2026-08-18 21:29:04','2026-08-18 21:53:11'),(293,9,'Vinaigre de riz','vinaigre-de-riz','L',NULL,'2026-08-18 21:29:04','2026-08-18 21:49:55'),(294,9,'Huile de sésame','huile-de-sesame','L',NULL,'2026-08-18 21:29:04','2026-08-18 21:53:11'),(295,9,'Safran (dose)','safran-dose','dose',NULL,'2026-08-18 21:38:03','2026-08-18 21:53:11'),(296,7,'Coulis de tomate (boîte)','coulis-de-tomate-boite','boîte',NULL,'2026-08-18 21:38:03','2026-08-18 21:53:11'),(297,10,'Café expresso (préparé)','cafe-expresso-prepare','L',NULL,'2026-08-18 21:40:40','2026-08-18 21:53:11'),(298,1,'Biscuits boudoirs (paquet)','biscuits-boudoirs-paquet','paquet',NULL,'2026-08-18 21:40:40','2026-08-18 21:53:11'),(299,10,'Amaretto','amaretto','L',NULL,'2026-08-18 21:40:41','2026-08-18 21:53:11'),(300,2,'Grana Padano','grana-padano','kg',NULL,'2026-08-18 21:46:47','2026-08-18 21:53:11'),(301,6,'Bouillon de volaille','bouillon-de-volaille','L',NULL,'2026-08-18 21:46:47','2026-08-18 21:53:11'),(302,7,'Girolles','girolles','kg',NULL,'2026-08-18 21:46:47','2026-08-18 21:53:11'),(303,7,'Ciboulette hachée','ciboulette-hachee','c. à soupe',NULL,'2026-08-18 22:02:47','2026-08-18 22:02:47'),(304,10,'Vin de riz Shaoxing','vin-de-riz-shaoxing','L',NULL,'2026-08-18 22:21:33','2026-08-18 22:21:33'),(305,9,'Cinq épices chinoises','cinq-epices-chinoises','c. à café',NULL,'2026-08-18 22:21:33','2026-08-18 22:21:33'),(306,7,'Basilic thaï','basilic-thai','botte',NULL,'2026-08-18 22:21:33','2026-08-18 22:21:33'),(307,1,'Nouilles de riz plates (séchées)','nouilles-de-riz-plates','kg',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(308,9,'Tofu ferme','tofu-ferme','kg',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(309,7,'Pousses de soja','pousses-de-soja','kg',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(310,7,'Ciboule chinoise (ciboulette ail)','ciboule-chinoise','kg',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(311,9,'Sucre de palme','sucre-de-palme','kg',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(312,5,'Sauce nuoc-mâm (sauce poisson)','sauce-nuoc-mam','L',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(313,9,'Pâte de tamarin','pate-de-tamarin','kg',NULL,'2026-08-18 22:23:00','2026-08-18 22:23:00'),(314,NULL,'Champignons forestiers (girolles, chanterelles grises, trompettes...)','champignons-forestiers-girolles-chanterelles-grises-trompettes','kg',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(315,NULL,'Champignons forestiers entiers','champignons-forestiers-entiers','kg',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(316,NULL,'Filets de volaille fermière (Gers)','filets-de-volaille-fermiere-gers','pièce',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(317,NULL,'Sel, poivre de Madagascar','sel-poivre-de-madagascar','QS',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(318,NULL,'Huile','huile','trait',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(319,NULL,'Beurre, huile','beurre-huile','QS',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(320,NULL,'Crème liquide','creme-liquide','L',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(321,NULL,'Farine','farine','kg',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(322,NULL,'Fond de volaille bio','fond-de-volaille-bio','L',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(323,NULL,'Crème fraîche épaisse bio','creme-fraiche-epaisse-bio','c. à soupe',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(324,NULL,'Pommes de terre fermes','pommes-de-terre-fermes','kg',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(325,NULL,'Jaunes d\'oeufs','jaunes-d-oeufs','pièce',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(326,NULL,'Ciboulette ciselée','ciboulette-ciselee','c. à soupe',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(327,NULL,'Sel, poivre','sel-poivre','QS',NULL,'2026-09-07 18:59:35','2026-09-07 18:59:35'),(328,NULL,'Filets de volaille fermière','filets-de-volaille-fermiere','pièce',NULL,'2026-09-07 19:05:58','2026-09-07 19:05:58'),(329,NULL,'Filet de volaille fermière Label Rouge (Gers)','filet-de-volaille-fermiere-label-rouge-gers','pièce',NULL,'2026-09-07 19:16:38','2026-09-07 19:16:38'),(330,NULL,'Champignons des bois (girolles, chanterelles, trompettes)','champignons-des-bois-girolles-chanterelles-trompettes','kg',NULL,'2026-09-07 19:16:38','2026-09-07 19:16:38'),(331,NULL,'Fond de volaille','fond-de-volaille','L',NULL,'2026-09-07 19:16:38','2026-09-07 19:16:38'),(332,NULL,'Nori (feuilles)','nori-feuilles','pièce',NULL,'2026-09-09 16:46:13','2026-09-09 16:46:13'),(333,NULL,'Mini-poireau','mini-poireau','pièce',NULL,'2026-09-09 16:46:13','2026-09-09 16:46:13'),(334,NULL,'Cerfeuil','cerfeuil','botte',NULL,'2026-09-09 16:49:24','2026-09-09 16:49:24'),(335,NULL,'Estragon','estragon','g',NULL,'2026-09-09 16:49:24','2026-09-09 16:49:24'),(336,NULL,'Cornichons','cornichons','g',NULL,'2026-09-09 16:49:24','2026-09-09 16:49:24'),(337,NULL,'Vinaigre d\'alcool blanc','vinaigre-alcool-blanc','L',NULL,'2026-09-09 16:49:24','2026-09-09 16:49:24'),(338,NULL,'Bouillon de bœuf','bouillon-de-boeuf','L',NULL,'2026-09-09 17:57:09','2026-09-09 17:57:09'),(339,NULL,'Carotte fane','carotte-fane','botte',NULL,'2026-09-09 17:57:09','2026-09-09 17:57:09'),(340,NULL,'Gorge de porc','gorge-de-porc','kg',NULL,'2026-09-09 18:03:44','2026-09-09 18:03:44'),(341,NULL,'Poitrine de porc','poitrine-de-porc','kg',NULL,'2026-09-09 18:03:44','2026-09-09 18:03:44'),(342,NULL,'Shitaké','shitake','kg',NULL,'2026-09-09 18:03:44','2026-09-09 18:03:44'),(343,NULL,'Oignon rouge','oignon-rouge','kg',NULL,'2026-09-09 18:03:44','2026-09-09 18:03:44'),(344,NULL,'Eau','eau','L',NULL,'2026-09-09 18:03:44','2026-09-09 18:03:44'),(345,2,'Cheddar (sauce)','cheddar-sauce','kg',NULL,'2026-09-09 19:17:25','2026-09-09 19:17:25'),(346,NULL,'Tranche de brioche','tranche-de-brioche','pièce',NULL,'2026-09-09 19:50:37','2026-09-09 19:50:37'),(347,NULL,'Sucre glace','sucre-glace','kg',NULL,'2026-09-09 19:50:37','2026-09-09 19:50:37'),(348,NULL,'Confiture de framboise','confiture-de-framboise','kg',NULL,'2026-09-09 19:50:37','2026-09-09 19:50:37'),(349,NULL,'Chocolat blanc','chocolat-blanc','kg',NULL,'2026-09-09 19:50:37','2026-09-09 19:50:37'),(350,NULL,'Menthe fraîche','menthe-fraiche','botte',NULL,'2026-09-09 19:50:37','2026-09-09 19:50:37');
/*!40000 ALTER TABLE `ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_sections`
--

DROP TABLE IF EXISTS `menu_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_sections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `menu_sections_menu_id_foreign` (`menu_id`),
  CONSTRAINT `menu_sections_menu_id_foreign` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_sections`
--

LOCK TABLES `menu_sections` WRITE;
/*!40000 ALTER TABLE `menu_sections` DISABLE KEYS */;
INSERT INTO `menu_sections` VALUES (12,1,'Brunch',1,'2026-09-09 19:39:41','2026-09-09 19:39:41'),(13,1,'Dessert',2,'2026-09-09 19:39:41','2026-09-09 19:39:41'),(18,2,'A partager',1,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(19,2,'Entrées',2,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(20,2,'Plats',3,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(21,2,'Dessert',4,'2026-09-09 20:05:29','2026-09-09 20:05:29');
/*!40000 ALTER TABLE `menu_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menus`
--

DROP TABLE IF EXISTS `menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menus` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `starts_at` date DEFAULT NULL,
  `ends_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menus_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menus`
--

LOCK TABLES `menus` WRITE;
/*!40000 ALTER TABLE `menus` DISABLE KEYS */;
INSERT INTO `menus` VALUES (1,'Menu Brunch (exemple)','menu-brunch-exemple','Menu brunch de démonstration, généré par le seeder exemple.','2026-07-30','2026-08-30','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Menu automne','menu-automne',NULL,NULL,NULL,'2026-09-09 18:13:16','2026-09-09 18:13:16');
/*!40000 ALTER TABLE `menus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `channel_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_user_id_foreign` (`user_id`),
  KEY `messages_parent_id_foreign` (`parent_id`),
  KEY `messages_channel_id_created_at_index` (`channel_id`,`created_at`),
  CONSTRAINT `messages_channel_id_foreign` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_07_15_174758_create_categories_table',1),(5,'2026_07_15_175716_create_stations_table',1),(6,'2026_07_15_180031_create_allergens_table',1),(7,'2026_07_15_211646_create_pictures_table',1),(8,'2026_07_15_211647_create_ingredients_table',1),(9,'2026_07_15_211648_create_allergen_ingredient_table',1),(10,'2026_07_15_212520_create_fiche_techniques_table',1),(11,'2026_07_15_212521_create_fiche_technique_ingredient_table',1),(12,'2026_07_15_212522_create_steps_table',1),(13,'2026_07_15_221901_create_ingredient_categories_table',1),(14,'2026_07_15_221902_add_ingredient_category_id_to_ingredients_table',1),(15,'2026_07_15_223821_add_equipment_and_plating_to_fiche_techniques_table',1),(16,'2026_07_15_224710_add_chef_tip_haccp_conservation_to_fiche_techniques_table',1),(17,'2026_07_16_081116_add_group_label_to_fiche_technique_ingredient_table',1),(18,'2026_07_16_083414_create_menus_table',1),(19,'2026_07_16_083415_create_menu_sections_table',1),(20,'2026_07_16_083416_create_plats_table',1),(21,'2026_07_16_083425_create_fiche_technique_plat_table',1),(22,'2026_07_16_085006_add_dates_to_menus_table',1),(23,'2026_07_16_121638_make_pictureable_nullable_on_pictures_table',1),(24,'2026_07_16_151711_create_appareils_table',1),(25,'2026_07_16_151712_create_temperature_releves_table',1),(26,'2026_07_16_155428_add_temperature_range_to_appareils_table',1),(27,'2026_07_16_193437_create_personal_access_tokens_table',1),(28,'2026_07_16_193453_add_role_to_users_table',1),(29,'2026_07_16_201047_create_friteuses_table',1),(30,'2026_07_16_201048_create_changement_huiles_table',1),(31,'2026_07_17_090000_create_channels_table',1),(32,'2026_07_17_090001_create_messages_table',1),(33,'2026_07_17_110000_create_shopping_items_table',1),(34,'2026_07_17_130000_create_events_table',1),(35,'2026_07_17_140000_add_detail_and_horaire_to_events_table',1),(36,'2026_07_17_150000_add_couverts_and_type_to_events_table',1),(37,'2026_07_17_160000_add_position_to_channels_table',1),(38,'2026_08_01_212704_create_printed_labels_table',2),(39,'2026_09_07_215452_add_station_id_to_shopping_items_table',3),(40,'2026_09_07_220845_create_mise_en_place_items_table',4),(41,'2026_09_07_222244_add_deadline_and_urgency_to_mise_en_place_items_table',5),(42,'2026_09_07_231601_create_settings_table',6);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mise_en_place_items`
--

DROP TABLE IF EXISTS `mise_en_place_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mise_en_place_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `station_id` bigint unsigned NOT NULL,
  `deadline` datetime DEFAULT NULL,
  `urgency` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'moyenne',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'todo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mise_en_place_items_user_id_foreign` (`user_id`),
  KEY `mise_en_place_items_station_id_foreign` (`station_id`),
  CONSTRAINT `mise_en_place_items_station_id_foreign` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `mise_en_place_items_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mise_en_place_items`
--

LOCK TABLES `mise_en_place_items` WRITE;
/*!40000 ALTER TABLE `mise_en_place_items` DISABLE KEYS */;
INSERT INTO `mise_en_place_items` VALUES (3,1,1,NULL,'moyenne','Croquette','done','2026-09-07 20:16:57','2026-09-07 20:34:41'),(4,1,1,NULL,'moyenne','Salade','done','2026-09-07 20:17:09','2026-09-07 20:34:36'),(5,1,2,NULL,'moyenne','Decouper saumon','done','2026-09-07 20:17:24','2026-09-07 20:28:23'),(8,1,3,'2026-09-08 22:28:00','moyenne','Test','done','2026-09-07 20:28:07','2026-09-07 20:28:24');
/*!40000 ALTER TABLE `mise_en_place_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',1,'api','2d09c98a301c731073c85309824946f0ee60d285e5087ccef0c8516bf1202c67','[\"*\"]','2026-07-30 17:22:09',NULL,'2026-07-30 17:22:08','2026-07-30 17:22:09'),(2,'App\\Models\\User',1,'api','821a950d008cf75fe1c4de46c5280524e4185ccf19e84468f3f8404c2d5e3cab','[\"*\"]','2026-08-01 20:55:07',NULL,'2026-08-01 20:39:58','2026-08-01 20:55:07'),(3,'App\\Models\\User',1,'api','798d44ff2660243d6647dc24fbc4ccbdb3233d2691d587c601c5e89f6211bbc8','[\"*\"]','2026-08-10 16:00:32',NULL,'2026-08-01 20:48:30','2026-08-10 16:00:32'),(4,'App\\Models\\User',1,'api','bf4efe7137806f474c1f0e5de6adbcdc85e6815fd974ad53a8cf70fc65652930','[\"*\"]',NULL,NULL,'2026-08-01 21:04:06','2026-08-01 21:04:06'),(5,'App\\Models\\User',1,'api','9b55d1fcca411c9044fbe33edac16c5072abc4c67bca4d70d864194eb5816795','[\"*\"]','2026-08-01 21:04:30',NULL,'2026-08-01 21:04:29','2026-08-01 21:04:30'),(6,'App\\Models\\User',1,'api','5d3891344df1911d8f3c4f4773045a3567ffded3a97294648b53faf46838d593','[\"*\"]','2026-08-02 16:11:52',NULL,'2026-08-01 21:05:01','2026-08-02 16:11:52'),(7,'App\\Models\\User',1,'api','a60fe40c78f255371e0a1624415e62fd48dc55a28c263e6bc6c807a1a931426f','[\"*\"]','2026-08-01 21:06:53',NULL,'2026-08-01 21:06:48','2026-08-01 21:06:53'),(8,'App\\Models\\User',1,'api','2097b3c9773fd67c0b6fde0b49502fb10f9de2fd65739237f06a019121ae89dc','[\"*\"]','2026-08-01 21:55:12',NULL,'2026-08-01 21:55:12','2026-08-01 21:55:12'),(9,'App\\Models\\User',1,'api','6750a502ff62dbace05cd5a614fc80e1c234659b41c19a8f7dc17907673fa508','[\"*\"]','2026-08-01 21:56:04',NULL,'2026-08-01 21:56:04','2026-08-01 21:56:04'),(10,'App\\Models\\User',1,'api','b37f572bbe75a4046a3f951fe8e5a263ef6fc6e95170770a2d98a8f2c55ca753','[\"*\"]',NULL,NULL,'2026-08-01 22:01:55','2026-08-01 22:01:55'),(11,'App\\Models\\User',1,'api','b6f19ad842e45b8b773c16469d71725a10d4937925c8dade72029b3c1267432f','[\"*\"]','2026-08-01 22:03:47',NULL,'2026-08-01 22:03:47','2026-08-01 22:03:47'),(12,'App\\Models\\User',1,'api','eeaf5d4231a167799749b4e753a52d34c27e078b97c88df76e8145dc370a690b','[\"*\"]','2026-09-07 23:11:33',NULL,'2026-08-16 19:49:09','2026-09-07 23:11:33'),(13,'App\\Models\\User',1,'api','aba3e972bf1470ac5fb79d8c712ba6e7f0f01cde4c99cc4975b373623b529397','[\"*\"]','2026-09-09 20:05:29',NULL,'2026-08-16 19:52:13','2026-09-09 20:05:29'),(14,'App\\Models\\User',1,'api','584607f2f62472f05187336e2285b09eb95b6d39198884096c5c13634d41bb70','[\"*\"]','2026-08-18 19:24:38',NULL,'2026-08-18 19:23:15','2026-08-18 19:24:38'),(15,'App\\Models\\User',1,'api','72fd305ec673a30ee8c61ce08d85119d9f57a693b6385d5f7832f46c9bca9dfe','[\"*\"]','2026-08-18 22:23:32',NULL,'2026-08-18 19:27:20','2026-08-18 22:23:32'),(16,'App\\Models\\User',1,'api','65f7688a32ecfc9fd0a716798d2a853ab286170413b8a50b5ccd3628ffc0f81c','[\"*\"]','2026-08-22 14:43:26',NULL,'2026-08-22 13:52:41','2026-08-22 14:43:26'),(17,'App\\Models\\User',1,'api','8c0cd69abdf73417708040c23004b1c8003b0e85f846bb278b1758a8b0dd8313','[\"*\"]','2026-09-07 23:03:48',NULL,'2026-09-07 19:16:20','2026-09-07 23:03:48'),(18,'App\\Models\\User',1,'api','6143dc8775c170930c06cf518cf4322db9a2a457d5f21af617a8440e7af47474','[\"*\"]','2026-09-09 20:05:43',NULL,'2026-09-07 23:44:13','2026-09-09 20:05:43'),(19,'App\\Models\\User',1,'api','635786dc9d5eaac63aad11815135d999888bc8cb1f17462d6099ec26272a5353','[\"*\"]','2026-09-09 19:53:11',NULL,'2026-09-09 16:45:15','2026-09-09 19:53:11');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pictures`
--

DROP TABLE IF EXISTS `pictures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pictures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `pictureable_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pictureable_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pictures_pictureable_type_pictureable_id_index` (`pictureable_type`,`pictureable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pictures`
--

LOCK TABLES `pictures` WRITE;
/*!40000 ALTER TABLE `pictures` DISABLE KEYS */;
INSERT INTO `pictures` VALUES (1,'http://localhost:8000/storage/pictures/c94VSKprnHeeJa4bkpKlimNKwBMQfLLdqBR847us.png','2026-09-09 18:33:55','2026-09-09 18:34:03','App\\Models\\FicheTechnique',31);
/*!40000 ALTER TABLE `pictures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plats`
--

DROP TABLE IF EXISTS `plats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plats` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `menu_section_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `position` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `plats_menu_section_id_foreign` (`menu_section_id`),
  CONSTRAINT `plats_menu_section_id_foreign` FOREIGN KEY (`menu_section_id`) REFERENCES `menu_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plats`
--

LOCK TABLES `plats` WRITE;
/*!40000 ALTER TABLE `plats` DISABLE KEYS */;
INSERT INTO `plats` VALUES (26,12,'Crêpes sucrées',NULL,1,'2026-09-09 19:39:41','2026-09-09 19:39:41'),(27,13,'Le véritable Tiramisu',NULL,1,'2026-09-09 19:39:41','2026-09-09 19:39:41'),(28,13,'Coulant au chocolat',NULL,2,'2026-09-09 19:39:41','2026-09-09 19:39:41'),(40,18,'Fish and chips / sauce tartare (8pc.)',NULL,1,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(41,18,'Chili cheese nugget',NULL,2,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(42,18,'Chou fleur bang bang',NULL,3,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(43,19,'Arancini à la sicillienne',NULL,1,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(44,19,'Saumon gravlax au gin',NULL,2,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(45,20,'Pad thaï au poulet',NULL,1,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(46,20,'Ballottine de volaille fermière aux champignons forestiers',NULL,2,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(47,20,'Civet de biche',NULL,3,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(48,20,'Cabillaud marbré & légumes verts',NULL,4,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(49,21,'Le véritable tiramissu',NULL,1,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(50,21,'Coulant au chocolat',NULL,2,'2026-09-09 20:05:29','2026-09-09 20:05:29'),(51,21,'Milles feuilles brioche / fraise / menthe / chantilly',NULL,3,'2026-09-09 20:05:29','2026-09-09 20:05:29');
/*!40000 ALTER TABLE `plats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `printed_labels`
--

DROP TABLE IF EXISTS `printed_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printed_labels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `use_by_date` date DEFAULT NULL,
  `quantity` tinyint unsigned NOT NULL,
  `printed_via` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `printed_labels_user_id_foreign` (`user_id`),
  KEY `printed_labels_created_at_index` (`created_at`),
  CONSTRAINT `printed_labels_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printed_labels`
--

LOCK TABLES `printed_labels` WRITE;
/*!40000 ALTER TABLE `printed_labels` DISABLE KEYS */;
INSERT INTO `printed_labels` VALUES (1,1,'admin','produit','test','2026-08-01','2026-08-04',1,'browser','2026-08-01 21:54:57','2026-08-01 21:54:57'),(2,1,'admin','produit','produit','2026-08-01','2026-08-04',1,'browser','2026-08-01 21:54:57','2026-08-01 21:54:57'),(3,1,'admin','produit','test','2026-08-01','2026-08-04',1,'browser','2026-08-01 21:55:01','2026-08-01 21:55:01'),(4,1,'admin','produit','produit','2026-08-01','2026-08-04',1,'browser','2026-08-01 21:55:01','2026-08-01 21:55:01'),(5,1,'admin','produit','Crêpes sucrées (exemple)','2026-08-02','2026-08-05',1,'browser','2026-08-01 22:07:59','2026-08-01 22:07:59'),(6,1,'admin','produit','Vitello tonnato (cuisson sous vide)','2026-08-18','2026-08-21',1,'browser','2026-08-18 20:34:26','2026-08-18 20:34:26'),(7,1,'admin','ouvert','Amandes effilées','2026-08-18',NULL,1,'browser','2026-08-18 20:44:32','2026-08-18 20:44:32'),(8,1,'admin','ouvert','Beurre de cacahuète','2026-08-18',NULL,1,'browser','2026-08-18 20:44:32','2026-08-18 20:44:32'),(9,1,'admin','ouvert','Anchois','2026-08-22','2026-08-25',1,'brother_ql','2026-08-22 13:53:00','2026-08-22 13:53:00'),(10,1,'admin','ouvert','Anchois','2026-08-22','2026-08-25',1,'brother_ql','2026-08-22 13:54:02','2026-08-22 13:54:02'),(11,1,'admin','decongele','Café expresso (préparé)','2026-08-22','2026-08-24',1,'brother_ql','2026-08-22 13:55:35','2026-08-22 13:55:35'),(12,1,'admin','congele','bbbb','2026-08-22',NULL,1,'brother_ql','2026-08-22 13:57:50','2026-08-22 13:57:50'),(13,1,'admin','jeter','test','2026-08-22','2026-08-25',1,'brother_ql','2026-08-22 13:57:50','2026-08-22 13:57:50'),(14,1,'admin','produit','tesrt','2026-08-22','2026-08-25',1,'brother_ql','2026-08-22 13:57:50','2026-08-22 13:57:50'),(15,1,'admin','decongele','Café expresso (préparé)','2026-08-22','2026-08-24',1,'brother_ql','2026-08-22 13:57:50','2026-08-22 13:57:50'),(16,1,'admin','ouvert','Thon en boîte','2026-08-22','2026-08-25',1,'brother_ql','2026-08-22 14:01:55','2026-08-22 14:01:55'),(17,1,'admin','decongele','test','2026-08-22','2026-08-24',1,'brother_ql','2026-08-22 14:04:39','2026-08-22 14:04:39'),(18,1,'admin','ouvert','test','2026-08-22',NULL,1,'brother_ql','2026-08-22 14:04:39','2026-08-22 14:04:39'),(19,1,'admin','ouvert','test','2026-08-22',NULL,1,'brother_ql','2026-08-22 14:39:17','2026-08-22 14:39:17'),(20,1,'admin','ouvert','test','2026-08-22',NULL,1,'brother_ql','2026-08-22 14:39:21','2026-08-22 14:39:21'),(21,1,'admin','ouvert','DSDDS','2026-08-22',NULL,1,'browser','2026-08-22 14:40:02','2026-08-22 14:40:02'),(22,1,'admin','ouvert','DSDDS','2026-08-22',NULL,1,'brother_ql','2026-08-22 14:42:57','2026-08-22 14:42:57'),(23,1,'admin','ouvert','Test impression','2026-08-22',NULL,1,'brother_ql','2026-08-22 14:43:12','2026-08-22 14:43:12'),(24,1,'admin','ouvert','Test impression','2026-08-22',NULL,1,'brother_ql','2026-08-22 14:43:26','2026-08-22 14:43:26'),(26,1,'admin','ouvert','rzqr','2026-09-07',NULL,1,'browser','2026-09-07 21:31:24','2026-09-07 21:31:24');
/*!40000 ALTER TABLE `printed_labels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('jklTz5Ra6zv9Oo858QPoxodiHJvolozuH14KtfZH',NULL,'192.168.65.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15','eyJfdG9rZW4iOiJoRGR0WUFXcFk5QjNIZmVrZ1JBbHJ2YUdKOHpRbXd0MXVpczhZdnk3IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2xvY2FsaG9zdDo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1785682721);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'printer_ip',NULL,'2026-09-07 21:17:40','2026-09-07 23:02:38'),(2,'printer_dpi',NULL,'2026-09-07 23:02:18','2026-09-07 23:02:38'),(3,'label_width_mm',NULL,'2026-09-07 23:02:18','2026-09-07 23:02:38'),(4,'label_height_mm',NULL,'2026-09-07 23:02:18','2026-09-07 23:02:38');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shopping_items`
--

DROP TABLE IF EXISTS `shopping_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shopping_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `station_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'todo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shopping_items_user_id_foreign` (`user_id`),
  KEY `shopping_items_station_id_foreign` (`station_id`),
  CONSTRAINT `shopping_items_station_id_foreign` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shopping_items_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shopping_items`
--

LOCK TABLES `shopping_items` WRITE;
/*!40000 ALTER TABLE `shopping_items` DISABLE KEYS */;
INSERT INTO `shopping_items` VALUES (1,1,NULL,'Farine T55','done','2026-07-30 17:21:42','2026-08-01 20:50:51'),(2,1,NULL,'Beurre doux','done','2026-07-30 17:21:42','2026-08-01 20:50:51'),(3,1,NULL,'Œufs (plateau de 30)','todo','2026-07-30 17:21:42','2026-09-07 17:31:59'),(4,1,NULL,'Papier essuie-tout','todo','2026-07-30 17:21:42','2026-09-07 17:31:56'),(9,1,NULL,'Test','todo','2026-09-07 20:04:21','2026-09-07 20:04:21'),(10,1,1,'Croquette de jambon','todo','2026-09-07 20:05:38','2026-09-07 20:05:38');
/*!40000 ALTER TABLE `shopping_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stations`
--

DROP TABLE IF EXISTS `stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stations_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stations`
--

LOCK TABLES `stations` WRITE;
/*!40000 ALTER TABLE `stations` DISABLE KEYS */;
INSERT INTO `stations` VALUES (1,'Viande','viande','#DC2626','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,'Poisson','poisson','#0EA5E9','2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,'Froid','froid','#06B6D4','2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,'Dessert','dessert','#EC4899','2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,'Brunch','brunch','#F59E0B','2026-07-30 17:21:42','2026-07-30 17:21:42');
/*!40000 ALTER TABLE `stations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `steps`
--

DROP TABLE IF EXISTS `steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `steps` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fiche_technique_id` bigint unsigned NOT NULL,
  `position` int unsigned NOT NULL,
  `instruction` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `timer_minutes` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `steps_fiche_technique_id_foreign` (`fiche_technique_id`),
  CONSTRAINT `steps_fiche_technique_id_foreign` FOREIGN KEY (`fiche_technique_id`) REFERENCES `fiche_techniques` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=608 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `steps`
--

LOCK TABLES `steps` WRITE;
/*!40000 ALTER TABLE `steps` DISABLE KEYS */;
INSERT INTO `steps` VALUES (12,2,1,'Cuire les pommes de terre.',30,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(13,2,2,'Mixer avec le lait et la crème.',NULL,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(14,2,3,'Passer au chinois.',NULL,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(15,2,4,'Mettre en siphon avec 2 cartouches.',NULL,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(16,2,5,'Cuire le lard croustillant.',NULL,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(17,2,6,'Pocher l\'espuma en verrine.',NULL,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(18,2,7,'Ajouter le lard.',NULL,'2026-08-18 19:25:54','2026-08-18 19:25:54'),(70,4,1,'Faire fondre le beurre dans une casserole et faire suer les échalotes hachées sans coloration.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(71,4,2,'Ajouter le thon frais coupé en morceaux. Faire revenir quelques minutes. Assaisonner avec le sel et le poivre vert.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(72,4,3,'Déglacer avec le vin blanc et laisser réduire presque à sec.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(73,4,4,'Ajouter le fond de veau ou le bouillon de bœuf. Porter à ébullition puis retirer du feu.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(74,4,5,'Laisser refroidir la préparation jusqu\'à environ 20°C.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(75,4,6,'Verser dans un récipient adapté puis ajouter les câpres, les anchois, les jaunes d\'œufs durs, le jus de citron et le Proespuma Frio.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(76,4,7,'Mixer soigneusement au mixeur plongeant jusqu\'à obtention d\'une texture parfaitement lisse.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(77,4,8,'Passer la préparation au chinois étamine afin d\'éliminer toutes les particules susceptibles d\'obstruer le siphon.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(78,4,9,'Verser dans un siphon d\'1 litre (ou deux siphons de 0,5 litre). Ajouter les cartouches de gaz et secouer vigoureusement.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(79,4,10,'Réserver au réfrigérateur pendant au minimum 2 heures avant utilisation.',120,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(80,4,11,'Servir sur de fines tranches de veau froides dans l\'esprit d\'un vitello tonnato revisité.',NULL,'2026-08-18 19:32:27','2026-08-18 19:32:27'),(88,5,1,'Préparer un roux avec le beurre et la farine.',NULL,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(89,5,2,'Ajouter le lait pour faire une béchamel.',NULL,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(90,5,3,'Ajouter poivre, muscade, parmesan et gruyère.',NULL,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(91,5,4,'Laisser reposer au moins deux heures au frais.',120,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(92,5,5,'Façonner les croquettes de 70 g.',NULL,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(93,5,6,'Passer à l\'anglaise (farine, blanc d\'œuf, chapelure).',NULL,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(94,5,7,'Frire à la friteuse à 180°C.',5,'2026-08-18 19:33:21','2026-08-18 19:33:21'),(95,6,1,'Mélanger la farine, le sucre et le sel dans un saladier, creuser un puits.',NULL,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(96,6,2,'Casser les œufs au centre et commencer à mélanger.',NULL,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(97,6,3,'Incorporer le lait progressivement en fouettant pour éviter les grumeaux.',NULL,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(98,6,4,'Ajouter le beurre fondu (en réserver un peu pour graisser la poêle) et bien mélanger.',NULL,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(99,6,5,'Laisser reposer la pâte au moins 30 minutes au frais.',30,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(100,6,6,'Cuire chaque crêpe dans une poêle chaude légèrement beurrée, des deux côtés.',2,'2026-08-18 19:34:21','2026-08-18 19:34:21'),(107,7,1,'Faire revenir les légumes (oignon, carotte, céleri) avec l\'ail écrasé dans l\'huile d\'olive.',NULL,'2026-08-18 19:36:52','2026-08-18 19:36:52'),(108,7,2,'Ajouter le canard effiloché, déglacer avec le vin rouge, laisser réduire.',NULL,'2026-08-18 19:36:52','2026-08-18 19:36:52'),(109,7,3,'Mouiller avec le fond de veau, laisser mijoter jusqu\'à consistance nappante.',15,'2026-08-18 19:36:52','2026-08-18 19:36:52'),(110,7,4,'Cuire les pappardelle dans une eau bouillante salée.',4,'2026-08-18 19:36:52','2026-08-18 19:36:52'),(111,7,5,'Mélanger les pâtes avec le ragù, ajuster l\'assaisonnement.',NULL,'2026-08-18 19:36:52','2026-08-18 19:36:52'),(112,7,6,'Monter la crème infusée au romarin en émulsion juste avant le dressage.',NULL,'2026-08-18 19:36:52','2026-08-18 19:36:52'),(113,8,1,'Faire suer les échalotes ciselées dans une noix de beurre, sans coloration.',NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(114,8,2,'Déglacer au vin blanc et laisser réduire de moitié.',NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(115,8,3,'Ajouter le fumet de poisson et laisser réduire à nouveau.',NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(116,8,4,'Incorporer la crème liquide et laisser réduire jusqu\'à consistance nappante.',NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(117,8,5,'Hors du feu, monter au beurre froid en fouettant, morceau par morceau.',NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(118,8,6,'Assaisonner en sel et poivre, puis passer au chinois avant de servir.',NULL,'2026-08-18 19:37:55','2026-08-18 19:37:55'),(119,9,1,'Égoutter et éponger la viande.',NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(120,9,2,'Filtrer la marinade et réserver le liquide.',NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(121,9,3,'Faire revenir les morceaux de biche dans le beurre.',NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(122,9,4,'Singer avec la farine.',NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(123,9,5,'Mouiller avec la marinade filtrée.',NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(124,9,6,'Ajouter la garniture aromatique (légumes et aromates de la marinade).',NULL,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(125,9,7,'Cuire à feu doux, cocotte couverte.',180,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(126,9,8,'Faire revenir séparément les lardons, les champignons de Paris et les oignons grelots, puis les ajouter à la cocotte pour les dernières minutes de cuisson.',20,'2026-08-18 19:42:02','2026-08-18 19:42:02'),(127,10,1,'[Chemisage des moules] Beurrer soigneusement les moules.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(128,10,2,'Saupoudrer de cacao, tapoter l\'excédent.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(129,10,3,'Réserver au frais.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(130,10,4,'[Fonte chocolat + beurre] Faire fondre ensemble au bain-marie ou micro-ondes.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(131,10,5,'Mélanger jusqu\'à texture lisse.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(132,10,6,'[Blanchir œufs + sucre] Fouetter les œufs entiers et les jaunes avec le sucre, sans trop incorporer d\'air.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(133,10,7,'[Mélange] Incorporer le mélange chocolat-beurre tiédi.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(134,10,8,'Ajouter la farine tamisée.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(135,10,9,'Mélanger délicatement à la maryse.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(136,10,10,'[Repos appareil, optionnel] Filmer au contact.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(137,10,11,'Réserver au froid pour une meilleure tenue à la cuisson.',30,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(138,10,12,'[Mise en moule] Remplir les moules aux ¾.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(139,10,13,'[Cuisson] Cuire au four préchauffé à 200°C (chaleur statique) — extérieur cuit, cœur coulant.',9,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(140,10,14,'[Démoulage & service] Laisser reposer avant de démouler.',1,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(141,10,15,'Démouler délicatement.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(142,10,16,'Servir immédiatement.',NULL,'2026-08-18 19:54:06','2026-08-18 19:54:06'),(150,11,1,'Déposer une fine couche du mélange au fond d\'un plat gastro.',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(151,11,2,'Poser le saumon (chair vers le haut).',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(152,11,3,'Arroser régulièrement avec le gin.',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(153,11,4,'Recouvrir du reste du mélange.',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(154,11,5,'Ajouter l\'aneth généreusement.',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(155,11,6,'Filmer serré. Réserver à +2/+4°C pendant 36 à 48 h, en retournant le filet toutes les 12 h.',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(156,11,7,'Retirer l\'aneth et l\'excédent de sel. Ne pas rincer (ou très légèrement si trop salé). Sécher, filmer proprement.',NULL,'2026-08-18 19:58:28','2026-08-18 19:58:28'),(157,12,1,'Mixer finement le gorgonzola, le lait, l\'huile d\'olive, le sel et le poivre au blender.',NULL,'2026-08-18 20:09:28','2026-08-18 20:09:28'),(158,12,2,'Passer le mélange au tamis fin pour retirer les grumeaux.',NULL,'2026-08-18 20:09:28','2026-08-18 20:09:28'),(159,12,3,'Ajouter la crème liquide et verser dans le siphon.',NULL,'2026-08-18 20:09:28','2026-08-18 20:09:28'),(160,12,4,'Visser les cartouches de gaz et secouer vigoureusement.',NULL,'2026-08-18 20:09:28','2026-08-18 20:09:28'),(161,12,5,'Réserver le siphon au réfrigérateur avant utilisation.',120,'2026-08-18 20:09:28','2026-08-18 20:09:28'),(182,13,1,'Faire revenir le céleri, le poireau, la carotte, l\'échalote et l\'ail à l\'huile d\'olive dans une poêle chaude, puis déglacer au vin blanc et au fond de veau.',NULL,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(183,13,2,'Ajouter le laurier, le piment de la Jamaïque, le poivre en grains et le persil ; laisser réduire à feu moyen jusqu\'à n\'avoir plus que quelques cuillères à soupe de liquide.',NULL,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(184,13,3,'Passer le jus au chinois, en frotter la viande, puis mettre sous vide.',NULL,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(185,13,4,'Chauffer l\'eau du bain sous vide à 60°C ; cuire la viande sous vide.',120,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(186,13,5,'Retirer du sachet, éponger la viande et laisser reposer au réfrigérateur.',120,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(187,13,6,'Piler au mortier le thon, les câpres, les anchois et le jus de citron.',NULL,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(188,13,7,'Préparer une mayonnaise avec l\'œuf et l\'huile de colza ; assaisonner avec la pâte de thon et le sel.',NULL,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(189,13,8,'Trancher finement la viande, dresser sur assiette et napper de sauce thonnée.',NULL,'2026-08-18 20:58:58','2026-08-18 20:58:58'),(208,16,1,'Faire suer l\'échalote au beurre, sans coloration.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(209,16,2,'Déglacer au cognac (flamber si souhaité) et laisser réduire à sec.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(210,16,3,'Mouiller avec le fond de veau, ajouter le poivre concassé, laisser réduire de moitié.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(211,16,4,'Incorporer la crème liquide et laisser réduire jusqu\'à consistance nappante.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(212,16,5,'Rectifier l\'assaisonnement en sel. Passer au chinois pour une texture lisse si souhaité.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(213,17,1,'Faire suer l\'échalote au beurre, sans coloration.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(214,17,2,'Ajouter les champignons émincés et les faire revenir jusqu\'à évaporation de leur eau de végétation.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(215,17,3,'Déglacer au vin blanc et laisser réduire.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(216,17,4,'Mouiller avec le fond de veau et laisser réduire de moitié.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(217,17,5,'Incorporer la crème liquide et laisser réduire jusqu\'à consistance nappante.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(218,17,6,'Rectifier l\'assaisonnement en sel et poivre. Parsemer de persil ciselé au moment de servir.',NULL,'2026-08-18 21:04:50','2026-08-18 21:04:50'),(219,14,1,'Éplucher les pommes de terre, les couper en cubes, cuire à l\'eau salée jusqu\'à tendreté.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(220,14,2,'Égoutter et écraser à la fourchette.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(221,14,3,'Égoutter les sardines et retirer l\'arête centrale ; retirer les piments si désiré.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(222,14,4,'Mélanger les sardines écrasées avec la purée de pommes de terre.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(223,14,5,'Ajouter le jus de citron vert et l\'huile d\'olive.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(224,14,6,'Assaisonner avec quelques gouttes de piri piri et de sel ; goûter et ajuster.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(225,14,7,'Battre l\'œuf dans un bol, verser la chapelure dans un autre.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(226,14,8,'Prélever une cuillère à soupe de préparation, former un petit cylindre.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(227,14,9,'Rouler dans l\'œuf battu puis la chapelure ; répéter pour plus de croustillant.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(228,14,10,'Chauffer l\'huile de friture et cuire les croquettes en les retournant.',5,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(229,14,11,'Égoutter sur papier absorbant.',NULL,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(230,14,12,'Servir immédiatement, ou préparer à l\'avance et réchauffer au four à 200°C.',15,'2026-08-18 21:19:43','2026-08-18 21:19:43'),(317,19,1,'Porter à ébullition de l\'eau salée, cuire le riz sans l\'égoutter.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(318,19,2,'Ajouter 2 œufs, le beurre, le Parmigiano et la muscade, mélanger.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(319,19,3,'Laisser refroidir, puis parfumer au safran.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(320,19,4,'[Ragù] Faire revenir l\'oignon et la carotte, ajouter la viande hachée, le vin blanc, les petits pois et le coulis de tomate.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(321,19,5,'Laisser mijoter à feu doux.',10,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(322,19,6,'[Façonnage] Creuser une boule de riz, garnir de ragù et de fromage, refermer.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(323,19,7,'Paner : farine, puis œuf battu, puis chapelure.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(324,19,8,'Frire à l\'huile chaude jusqu\'à coloration dorée.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(325,19,9,'Égoutter sur papier absorbant.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(326,19,10,'Parsemer de Parmesan râpé et servir.',NULL,'2026-08-18 21:43:29','2026-08-18 21:43:29'),(327,20,1,'Séparer les blancs des jaunes d\'œufs.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(328,20,2,'Battre vivement le sucre avec les jaunes jusqu\'à blanchissement du mélange.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(329,20,3,'Ajouter le mascarpone et mélanger délicatement jusqu\'à obtenir une surface lisse ; réserver au froid.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(330,20,4,'Monter les blancs en neige avec une pincée de sel, puis les incorporer délicatement à la préparation mascarpone.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(331,20,5,'Disposer la moitié des biscuits boudoirs imbibés de café fort (et d\'amaretto ou rhum si souhaité) sur le fond du plat.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(332,20,6,'Recouvrir avec la moitié de la crème mascarpone.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(333,20,7,'Ajouter une deuxième couche de biscuits boudoirs imbibés de café.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(334,20,8,'Recouvrir avec la deuxième moitié de la crème mascarpone.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(335,20,9,'Réfrigérer avant de servir.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(336,20,10,'Avant de servir, saupoudrer de cacao amer ou de copeaux de chocolat.',NULL,'2026-08-18 21:43:59','2026-08-18 21:43:59'),(345,21,1,'Faire bouillir les girolles 5 minutes dans une casserole d\'eau.',5,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(346,21,2,'Faire revenir l\'échalote à l\'huile d\'olive avec la chair à saucisse, jusqu\'à coloration.',NULL,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(347,21,3,'Déglacer au vin blanc et laisser évaporer.',NULL,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(348,21,4,'Ajouter le riz et les girolles, assaisonner en sel.',NULL,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(349,21,5,'Cuire à feu doux en remuant constamment, en ajoutant le bouillon louche par louche.',20,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(350,21,6,'En fin de cuisson, incorporer le beurre, le poivre moulu et le Grana Padano.',NULL,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(351,21,7,'Retirer du feu et incorporer la ricotta pour la texture crémeuse.',NULL,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(352,21,8,'Laisser reposer quelques minutes avant de servir, avec du persil en garniture.',3,'2026-08-18 21:49:09','2026-08-18 21:49:09'),(353,22,1,'Mélanger la crème, le thym, le sel, l\'ail et le poivre.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(354,22,2,'Trancher finement les pommes de terre épluchées.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(355,22,3,'Enrober les tranches dans la crème assaisonnée.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(356,22,4,'Disposer les tranches en couches alternées dans le moule chemisé, avec des dés de beurre, sel et poivre entre les couches.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(357,22,5,'Fermer hermétiquement avec du papier aluminium.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(358,22,6,'Cuire au four à 180°C.',60,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(359,22,7,'Laisser refroidir, puis comprimer avec un poids (autre moule ou plaque lestée).',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(360,22,8,'Découper en petits carrés.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(361,22,9,'Dorer à la poêle à l\'huile d\'olive avec thym, sel et ciboulette avant de servir.',NULL,'2026-08-18 22:03:01','2026-08-18 22:03:01'),(362,23,1,'Découper le poulet en morceaux, mariner avec les ingrédients de la marinade.',30,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(363,23,2,'Étaler la fécule sur une plaque. Avec les mains mouillées, enrober le poulet mariné en massant jusqu\'à formation de petites billes de fécule en surface.',NULL,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(364,23,3,'Chauffer l\'huile à 175°C (350°F). Frire le poulet par petites quantités jusqu\'à coloration dorée et croustillante, sans surcharger.',4,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(365,23,4,'Égoutter sur grille ; assaisonner immédiatement avec le mélange d\'épices pendant que c\'est chaud.',NULL,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(366,23,5,'Faire frire rapidement le basilic thaï dans l\'huile chaude, couvrir immédiatement (attention aux projections).',NULL,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(367,23,6,'Retirer le basilic à l\'écumoire, le parsemer sur le poulet. Laisser tiédir légèrement avant de servir.',NULL,'2026-08-18 22:21:52','2026-08-18 22:21:52'),(376,24,1,'[Sauce] Dans le wok à feu doux-moyen, caraméliser le sucre de palme en remuant.',3,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(377,24,2,'Mélanger la pâte de tamarin avec le sucre caramélisé, puis ajouter la sauce nuoc-mâm. Réserver.',NULL,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(378,24,3,'[Cuisson] Chauffer un peu d\'huile dans le wok, cuire le poulet à point, réserver.',NULL,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(379,24,4,'Ajouter un peu d\'huile, faire revenir l\'échalote et l\'ail 20-30 secondes, puis ajouter le tofu et sauter 1-2 minutes.',NULL,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(380,24,5,'Ajouter les nouilles égouttées avec la sauce et un peu d\'eau, mélanger et cuire en goûtant la texture.',6,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(381,24,6,'Ajouter le poulet cuit, pousser sur le côté du wok, ajouter le reste d\'huile et brouiller les œufs dans l\'espace libre, puis mélanger le tout.',NULL,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(382,24,7,'Ajouter les pousses de soja et la ciboule chinoise, sauter brièvement.',NULL,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(383,24,8,'Retirer du feu, garnir de quartiers de citron vert et de cacahuètes concassées avant de servir.',NULL,'2026-08-18 22:24:46','2026-08-18 22:24:46'),(397,26,1,'Suer l\'échalote et l\'oignon émincés dans un peu de beurre et un filet d\'huile d\'olive.',5,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(398,26,2,'Ajouter les champignons des bois taillés, cuire à sec jusqu\'à évaporation complète de l\'eau de végétation, saler, poivrer — réserver la moitié pour la sauce, garder l\'autre moitié comme duxelles de farce.',10,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(399,26,3,'Assaisonner les filets de volaille ouverts, garnir chacun de duxelles, rouler serré en ballottine, filmer et bien serrer les extrémités.',NULL,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(400,26,4,'Pocher les ballottines filmées dans une grande quantité d\'eau frémissante.',7,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(401,26,5,'Débarrasser, retirer le film, réserver au frais.',NULL,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(402,26,6,'Cuire les pommes de terre à l\'eau salée, égoutter, écraser au presse-purée et détendre avec la crème liquide chaude, rectifier l\'assaisonnement, ajouter la ciboulette ciselée.',20,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(403,26,7,'Réaliser un roux blond avec le beurre restant et la farine, mouiller progressivement avec le fond de volaille chaud en fouettant, laisser cuire à frémissement.',15,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(404,26,8,'Tempérer les jaunes d\'oeufs avec la crème fraîche et un peu de sauce chaude, puis lier la sauce hors du feu sans laisser bouillir.',NULL,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(405,26,9,'Ajouter la réserve de champignons sautés, le jus de citron et la muscade râpée à la sauce, rectifier l\'assaisonnement.',NULL,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(406,26,10,'Colorer les ballottines à la poêle dans un peu de beurre juste avant le dressage.',3,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(407,26,11,'Trancher les ballottines, napper de sauce suprême, dresser avec la purée.',NULL,'2026-09-07 19:17:16','2026-09-07 19:17:16'),(408,27,1,'Trancher le filet de cabillaud en fines lamelles dans le sens de la longueur.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(409,27,2,'Mixer les feuilles de nori en poudre fine.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(410,27,3,'Badigeonner les lamelles de cabillaud d\'huile d\'olive, assaisonner sel et poivre.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(411,27,4,'Rouler les lamelles dans la poudre de nori, façonner en ballottine serrée dans du film alimentaire.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(412,27,5,'Cuire la ballottine dans une casserole d\'eau frémissante jusqu\'à 52°C à cœur au thermomètre sonde',15,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(413,27,6,'Refroidir la ballottine puis la trancher en portions.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(414,27,7,'Cuire les petits pois de la purée dans une eau bouillante salée jusqu\'à ce qu\'ils éclatent',5,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(415,27,8,'Mixer les petits pois avec le beurre et la crème jusqu\'à obtenir une purée lisse, assaisonner.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(416,27,9,'Cuire séparément chaque légume de garniture (fèves, petits pois, mini-poireaux) dans une eau bouillante salée, en conservant du croquant',4,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(417,27,10,'Refroidir immédiatement les légumes dans le bain d\'eau glacée, puis égoutter.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(418,27,11,'Sauter les légumes égouttés au beurre, assaisonner.',NULL,'2026-09-09 16:46:32','2026-09-09 16:46:32'),(419,28,1,'Hacher finement le cerfeuil, l\'estragon, la ciboulette et le persil.',NULL,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(420,28,2,'Hacher finement les câpres et les cornichons.',NULL,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(421,28,3,'Dans un bol, mélanger les jaunes d\'oeufs avec la moutarde de Dijon, le sel et le poivre.',NULL,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(422,28,4,'Ajouter le vinaigre d\'alcool blanc et fouetter.',NULL,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(423,28,5,'Monter la mayonnaise en incorporant l\'huile de tournesol en filet, en fouettant énergiquement, jusqu\'à obtenir une texture ferme et onctueuse.',5,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(424,28,6,'Incorporer les herbes hachées, les câpres et les cornichons à la mayonnaise, mélanger délicatement.',NULL,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(425,28,7,'Rectifier l\'assaisonnement en sel et poivre.',NULL,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(426,28,8,'Réserver au frais jusqu\'au service.',10,'2026-09-09 16:49:44','2026-09-09 16:49:44'),(427,29,1,'Tamiser la farine dans un saladier, incorporer la bière petit à petit en fouettant.',NULL,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(428,29,2,'Ajouter le blanc d\'œuf et le sel, mélanger jusqu\'à obtenir une pâte lisse.',NULL,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(429,29,3,'Laisser reposer la pâte au réfrigérateur.',60,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(430,29,4,'Éplucher et tailler les pommes de terre en frites épaisses, rincer et sécher au papier absorbant.',NULL,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(431,29,5,'Tailler le cabillaud en bâtonnets.',NULL,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(432,29,6,'Chauffer l\'huile de friture et cuire les frites jusqu\'à coloration dorée, réserver.',NULL,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(433,29,7,'Tremper les bâtonnets de cabillaud dans la pâte à beignet, puis frire jusqu\'à cuisson complète.',10,'2026-09-09 16:50:32','2026-09-09 16:50:32'),(434,30,1,'Parer et assaisonner le paleron de bœuf.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(435,30,2,'Colorer la viande à l\'huile d\'olive dans une cocotte.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(436,30,3,'Ajouter les aromates (oignon, poireau, carotte, ail, thym, laurier), couvrir avec le bouillon de bœuf assaisonné.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(437,30,4,'Couvrir et cuire au four à 120°C jusqu\'à ce que la viande s\'effiloche facilement.',420,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(438,30,5,'Retirer la viande et l\'effilocher. Passer le jus de cuisson au chinois puis le réduire pour le concentrer.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(439,30,6,'Assaisonner la viande effilochée et la réserver avec le jus réduit pour la maintenir moelleuse.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(440,30,7,'Éplucher les pommes de terre, cuire à l\'eau salée ou au four.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(441,30,8,'Passer les pommes de terre au presse-purée, incorporer le beurre et le lait. Assaisonner et réserver au chaud.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(442,30,9,'Laver les carottes fanes, les disposer sur une plaque huilée, assaisonner.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(443,30,10,'Rôtir les carottes au four à 180°C jusqu\'à caramélisation et tendreté, en arrosant régulièrement de jus réduit pour éviter le dessèchement.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(444,30,11,'Dresser la viande effilochée dans un cercle, napper de jus réduit, ajouter une couche de purée.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(445,30,12,'Gratiner à la chapelure et au comté.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(446,30,13,'Servir chaud avec les carottes rôties et le reste du jus.',NULL,'2026-09-09 17:57:29','2026-09-09 17:57:29'),(447,31,1,'Mettre la farine et le beurre dans le batteur, mélanger à petite vitesse.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(448,31,2,'Faire bouillir l\'eau et le sel, laisser refroidir à 40°C.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(449,31,3,'Mélanger l\'eau salée à la farine et au beurre dans la cuve du batteur jusqu\'à obtenir une pâte homogène.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(450,31,4,'Réserver la pâte au réfrigérateur.',720,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(451,31,5,'Émincer les shitakés et les faire revenir à l\'huile d\'olive, puis laisser refroidir.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(452,31,6,'Ciseler l\'échalote et passer la viande (gorge, échine, poitrine de porc) au hachoir.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(453,31,7,'Combiner la viande hachée et les champignons, assaisonner avec le cognac, le sel et le poivre.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(454,31,8,'Réserver la farce au réfrigérateur.',720,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(455,31,9,'Étaler la pâte à la taille du moule, garnir avec la farce, refermer avec une bande de pâte.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(456,31,10,'Créer des cheminées avec de l\'aluminium, dorer et strier la pâte.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(457,31,11,'Cuire le pâté à la sonde jusqu\'à une température à cœur de 50°C.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(458,31,12,'Laisser refroidir une nuit au réfrigérateur.',720,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(459,31,13,'Préparer l\'oignon rouge en pickles avec l\'eau, le vinaigre et le sucre.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(460,31,14,'Réaliser une purée de carotte, en réservant quelques morceaux pour le dressage.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(461,31,15,'Blanchir des lamelles de courgette pour réaliser des rouleaux.',NULL,'2026-09-09 18:04:03','2026-09-09 18:04:03'),(551,3,1,'[Béchamel] Faire fondre le beurre à feu doux.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(552,3,2,'Ajouter la farine et mélanger pour obtenir un roux homogène.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(553,3,3,'Incorporer le lait progressivement en fouettant.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(554,3,4,'Cuire jusqu\'à épaississement.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(555,3,5,'Assaisonner avec sel, poivre, ail moulu et oignon en poudre.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(556,3,6,'[Fromage & jalapeños] Ajouter le cheddar et l\'emmental râpés dans la béchamel chaude.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(557,3,7,'Mélanger jusqu\'à fonte complète.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(558,3,8,'Ajouter les jalapeños finement émincés.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(559,3,9,'Verser dans un grand plat.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(560,3,10,'Filmer au contact.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(561,3,11,'Réserver au réfrigérateur minimum 3 heures.',180,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(562,3,12,'[Façonnage] Prélever des cuillères de préparation froide.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(563,3,13,'Former des boules régulières.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(564,3,14,'Préparer les stations de panure : farine / œufs battus / chapelure.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(565,3,15,'Paner dans l\'ordre : farine → œuf → chapelure.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(566,3,16,'[Cuisson] Chauffer l\'huile à 180°C.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(567,3,17,'Frire les nuggets par petites quantités.',3,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(568,3,18,'Égoutter sur papier absorbant.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(569,3,19,'[Sauce cheddar] Faire chauffer la crème liquide à feu doux sans bouillir.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(570,3,20,'Délayer la fécule de maïs dans un peu de crème froide, incorporer au mélange chaud en fouettant.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(571,3,21,'Ajouter le cheddar (sauce) hors du feu et mélanger jusqu\'à obtenir une sauce lisse et nappante.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(572,3,22,'[Service] Servir immédiatement les nuggets accompagnés de la sauce cheddar en saucière.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(573,3,23,'Consommer chaud pour garder le cœur fondant.',NULL,'2026-09-09 19:35:12','2026-09-09 19:35:12'),(574,18,1,'Mélanger la mayonnaise, la sauce sriracha et le miel dans un bol pour la sauce bang bang ; réserver.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(575,18,2,'Mélanger l\'ail moulu, l\'oignon en poudre, le paprika fumé, le sel et le poivre dans un bol.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(576,18,3,'Enrober le chou-fleur d\'huile d\'olive, puis saupoudrer du mélange d\'épices en mélangeant bien.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(577,18,4,'Saupoudrer de fécule de maïs et mélanger pour bien enrober.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(578,18,5,'Disposer le chou-fleur en une seule couche dans le four, cuire à 200°C en secouant toutes les 3-5 minutes.',12,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(579,18,6,'Pendant la cuisson, mélanger le reste du miel, la sauce sriracha, le vinaigre de riz et l\'huile de sésame pour le glaçage.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(580,18,7,'Retirer le chou-fleur cuit, le napper du glaçage et bien mélanger.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(581,18,8,'Remettre à l\'air fryer pour terminer la cuisson.',2,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(582,18,9,'Servir immédiatement avec la sauce bang bang en accompagnement.',NULL,'2026-09-09 19:36:15','2026-09-09 19:36:15'),(583,32,1,'[Saumon mariné] Placer les pavés de saumon au congélateur pendant 5 minutes.',5,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(584,32,2,'Désarêter les pavés et les tailler en cubes.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(585,32,3,'Préparer la marinade : mélanger la sauce soja avec le jus d\'un citron vert et un peu de graines de sésame.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(586,32,4,'Verser la marinade sur les cubes de saumon et réserver au frais.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(587,32,5,'[Riz] Cuire le riz complet dans un grand volume d\'eau bouillante et salée selon les indications du paquet.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(588,32,6,'Égoutter, rincer et réserver.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(589,32,7,'[Légumes] Éplucher le concombre et la betterave, les tailler en fins bâtonnets. Réserver.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(590,32,8,'Faire chauffer l\'huile d\'olive dans une poêle et faire sauter rapidement les pousses d\'épinard. Saler, poivrer. Réserver.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(591,32,9,'[Dressage] Déposer un fond de riz complet dans chaque bol.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(592,32,10,'Ajouter les dés de saumon d\'un côté, les épinards de l\'autre, puis les bâtonnets de concombre et betterave.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(593,32,11,'Ouvrir les fruits de la passion, prélever les graines à la cuillère et en déposer un peu dans chaque bol.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(594,32,12,'Saupoudrer de graines de sésame et arroser d\'un peu de marinade. Servir avec un quartier de citron vert.',NULL,'2026-09-09 19:48:17','2026-09-09 19:48:17'),(595,33,1,'[Feuilles croustillantes] Enlever la croûte des tranches de brioche.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(596,33,2,'À l\'aide d\'un rouleau, écraser les tranches pour obtenir des rectangles d\'environ 1 mm d\'épaisseur, les couper en 2.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(597,33,3,'Poser les rectangles sur une plaque à pâtisserie et enfourner à 180°C jusqu\'à légère coloration.',5,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(598,33,4,'Passer le four en mode gril. Saupoudrer uniformément les tranches de sucre glace et laisser caraméliser sous le gril quelques minutes.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(599,33,5,'[Crème] Monter la crème liquide en chantilly. Mettre le chocolat blanc à fondre.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(600,33,6,'Détendre le mascarpone avec un tiers de la crème fouettée. Ajouter délicatement le reste de la crème, puis le chocolat fondu.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(601,33,7,'Réserver au frais.',20,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(602,33,8,'[Coulis] Couper les fraises en cubes réguliers, réserver.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(603,33,9,'Mixer les parures de fraises avec les feuilles de menthe pour obtenir un coulis.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(604,33,10,'[Dressage] Étaler de la confiture de framboise sur 2/3 des tranches de brioche.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(605,33,11,'Réaliser une quenelle de mousse chocolat blanc sur chaque tranche garnie, ranger les cubes de fraises autour.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(606,33,12,'Monter 2 étages et terminer par une feuille de brioche nature.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05'),(607,33,13,'Poser le mille-feuille au centre de l\'assiette et ajouter un trait de coulis fraise-menthe.',NULL,'2026-09-09 19:51:05','2026-09-09 19:51:05');
/*!40000 ALTER TABLE `steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temperature_releves`
--

DROP TABLE IF EXISTS `temperature_releves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temperature_releves` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appareil_id` bigint unsigned NOT NULL,
  `temperature` decimal(4,1) NOT NULL,
  `recorded_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `temperature_releves_appareil_id_recorded_at_index` (`appareil_id`,`recorded_at`),
  CONSTRAINT `temperature_releves_appareil_id_foreign` FOREIGN KEY (`appareil_id`) REFERENCES `appareils` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temperature_releves`
--

LOCK TABLES `temperature_releves` WRITE;
/*!40000 ALTER TABLE `temperature_releves` DISABLE KEYS */;
INSERT INTO `temperature_releves` VALUES (1,1,3.2,'2026-07-28 08:00:00','2026-07-30 17:21:42','2026-07-30 17:21:42'),(2,1,3.8,'2026-07-28 20:00:00','2026-07-30 17:21:42','2026-07-30 17:21:42'),(3,1,2.9,'2026-07-29 08:00:00','2026-07-30 17:21:42','2026-07-30 17:21:42'),(4,1,6.2,'2026-07-29 20:00:00','2026-07-30 17:21:42','2026-07-30 17:21:42'),(5,1,3.5,'2026-07-30 08:00:00','2026-07-30 17:21:42','2026-07-30 17:21:42'),(6,1,3.8,'2026-07-30 20:00:00','2026-08-01 20:35:51','2026-08-01 20:35:51'),(7,1,2.9,'2026-07-31 08:00:00','2026-08-01 20:35:51','2026-08-01 20:35:51'),(8,1,6.2,'2026-07-31 20:00:00','2026-08-01 20:35:51','2026-08-01 20:35:51'),(9,1,3.5,'2026-08-01 08:00:00','2026-08-01 20:35:51','2026-08-01 20:35:51'),(10,1,9.5,'2026-08-01 20:41:34','2026-08-01 20:41:34','2026-08-01 20:41:34'),(11,1,6.0,'2026-08-01 20:52:31','2026-08-01 20:52:31','2026-08-01 20:52:31'),(12,1,5.0,'2026-08-01 21:06:24','2026-08-01 21:06:24','2026-08-01 21:06:24'),(13,2,4.0,'2026-08-01 21:06:25','2026-08-01 21:06:25','2026-08-01 21:06:25'),(14,2,4.5,'2026-08-01 21:06:50','2026-08-01 21:06:50','2026-08-01 21:06:50'),(15,2,3.0,'2026-09-07 17:33:00','2026-09-07 17:33:00','2026-09-07 17:33:00'),(16,1,4.0,'2026-09-07 17:33:05','2026-09-07 17:33:05','2026-09-07 17:33:05');
/*!40000 ALTER TABLE `temperature_releves` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin-8pLlKvTo@mise.local',NULL,'$2y$12$ritnr2X5Z058ocoK1TEGWOnI62/c7ciDFkhtUQOJ0.pYJgty4Dx36','admin',NULL,'2026-07-30 17:21:42','2026-07-30 17:21:42');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-09 20:06:25
