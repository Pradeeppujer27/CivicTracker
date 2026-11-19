package com.civictrack.service.impl;

import com.civictrack.entity.Category;
import com.civictrack.entity.Department;
import com.civictrack.repository.CategoryRepository;
import com.civictrack.repository.DepartmentRepository;
import com.civictrack.service.DepartmentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final CategoryRepository categoryRepository;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository, CategoryRepository categoryRepository) {
        this.departmentRepository = departmentRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> getCategoriesByDepartment(Long departmentId) {
        return categoryRepository.findByDepartmentId(departmentId);
    }
}
