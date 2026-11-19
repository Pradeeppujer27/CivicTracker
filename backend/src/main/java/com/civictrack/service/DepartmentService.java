package com.civictrack.service;

import com.civictrack.entity.Category;
import com.civictrack.entity.Department;

import java.util.List;

public interface DepartmentService {
    List<Department> getAllDepartments();
    List<Category> getAllCategories();
    List<Category> getCategoriesByDepartment(Long departmentId);
}
