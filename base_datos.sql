CREATE DATABASE IF NOT EXISTS habitspark;
USE habitspark;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  altura_cm INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  objetivo_minutos_per INT NOT NULL DEFAULT 0,
  periodo ENUM('diario','semanal','mensual') NOT NULL DEFAULT 'diario',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE habit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habit_id INT NOT NULL,
  user_id INT NOT NULL,
  fecha DATE NOT NULL,
  minutos INT NOT NULL DEFAULT 0,
  completado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY unique_log (habit_id, user_id, fecha)
);

CREATE TABLE user_stats (
  user_id INT PRIMARY KEY,
  last_login DATE,
  total_habits INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE libros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  autor VARCHAR(255),
  total_paginas INT,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE lectura_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libro_id INT NOT NULL,
  user_id INT NOT NULL,
  fecha DATE NOT NULL,
  paginas_leidas INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_lectura (libro_id, user_id, fecha)
);

CREATE TABLE libros_recomendados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  autor VARCHAR(255),
  descripcion TEXT,
  contenido TEXT, -- aquí va el texto completo o fragmentado del libro
  categoria VARCHAR(100),
  imagen_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lectura_logros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  libro_id INT NOT NULL,
  fecha DATE NOT NULL,
  paginas_leidas INT DEFAULT 0,
  racha INT DEFAULT 1,
  completado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_logro (user_id, libro_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (libro_id) REFERENCES libros_recomendados(id) ON DELETE CASCADE
);
