"""
Synthetic Dataset Generator

Generates realistic synthetic data for training ML models.
Creates 100k+ events as required by the assignment.
"""

import random
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

import pandas as pd
import numpy as np
import structlog

logger = structlog.get_logger(__name__)


class SyntheticDataGenerator:
    """
    Generator for synthetic student and enrollment data.
    
    Creates realistic datasets with:
    - Student demographics
    - Academic performance over time
    - Enrollment patterns
    - Dropout indicators
    """

    def __init__(self, seed: int = 42):
        """
        Initialize generator.
        
        Args:
            seed: Random seed for reproducibility
        """
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)
    
    def generate_student_data(self, num_students: int = 10000) -> pd.DataFrame:
        """
        Generate synthetic student data.
        
        Args:
            num_students: Number of students to generate
            
        Returns:
            DataFrame with student data
        """
        logger.info("Generating synthetic student data", count=num_students)
        
        students = []
        
        for i in range(num_students):
            # Demographics
            student = {
                'student_id': f'STU{i:06d}',
                'uuid': str(uuid4()),
                'age': np.random.randint(18, 35),
                'gender': random.choice(['M', 'F', 'Other']),
                'international': random.random() < 0.15,  # 15% international
                
                # Academic background
                'high_school_gpa': np.clip(np.random.normal(3.2, 0.5), 2.0, 4.0),
                'sat_score': int(np.clip(np.random.normal(1200, 150), 800, 1600)),
                
                # Current academic performance
                'current_gpa': np.clip(np.random.normal(3.0, 0.7), 0.0, 4.0),
                'credits_earned': np.random.randint(0, 120),
                'credits_enrolled': np.random.randint(12, 18),
                
                # Engagement metrics
                'attendance_rate': np.clip(np.random.normal(85, 15), 0, 100),
                'engagement_score': np.clip(np.random.beta(5, 2), 0, 1),  # Skewed toward high
                'study_hours_per_week': np.clip(np.random.gamma(10, 2), 0, 60),
                
                # Course performance
                'num_failed_courses': np.random.poisson(0.5),  # Most students fail few courses
                'num_withdrawals': np.random.poisson(0.3),
                'course_difficulty_avg': np.random.uniform(0.3, 0.9),
                
                # Risk factors
                'previous_dropout_risk': np.clip(np.random.beta(2, 5), 0, 1),  # Skewed low
                'financial_aid': random.random() < 0.6,  # 60% on financial aid
                'part_time_job': random.random() < 0.5,  # 50% work part-time
                
                # Outcomes
                'dropped_out': 0,  # Will be calculated
            }
            
            # Calculate dropout based on risk factors
            dropout_prob = self._calculate_dropout_probability(student)
            student['dropped_out'] = 1 if random.random() < dropout_prob else 0
            student['dropout_probability_true'] = dropout_prob
            
            students.append(student)
        
        df = pd.DataFrame(students)
        
        logger.info("Student data generated", count=len(df), dropout_rate=df['dropped_out'].mean())
        
        return df
    
    def _calculate_dropout_probability(self, student: dict) -> float:
        """
        Calculate realistic dropout probability based on risk factors.
        
        Args:
            student: Student data dictionary
            
        Returns:
            float: Dropout probability (0-1)
        """
        # Weighted factors
        prob = 0.0
        
        # GPA factor (strong predictor)
        if student['current_gpa'] < 2.0:
            prob += 0.4
        elif student['current_gpa'] < 2.5:
            prob += 0.2
        elif student['current_gpa'] < 3.0:
            prob += 0.05
        
        # Attendance factor
        if student['attendance_rate'] < 60:
            prob += 0.3
        elif student['attendance_rate'] < 75:
            prob += 0.15
        
        # Failed courses
        prob += min(student['num_failed_courses'] * 0.15, 0.3)
        
        # Engagement
        if student['engagement_score'] < 0.3:
            prob += 0.2
        
        # Previous risk
        prob += student['previous_dropout_risk'] * 0.2
        
        # Protective factors
        if student['financial_aid']:
            prob -= 0.05
        
        if student['study_hours_per_week'] > 20:
            prob -= 0.1
        
        return np.clip(prob, 0.0, 1.0)
    
    def generate_enrollment_events(self, num_events: int = 100000) -> pd.DataFrame:
        """
        Generate synthetic enrollment events for event store.
        
        Args:
            num_events: Number of events to generate (100k+ required)
            
        Returns:
            DataFrame with events
        """
        logger.info("Generating enrollment events", count=num_events)
        
        events = []
        start_date = datetime(2024, 1, 1)
        
        event_types = [
            'student_enrolled',
            'student_waitlisted',
            'student_dropped',
            'grade_assigned',
            'section_created',
            'course_created',
        ]
        
        for i in range(num_events):
            event = {
                'event_id': str(uuid4()),
                'event_type': random.choice(event_types),
                'aggregate_id': str(uuid4()),
                'timestamp': start_date + timedelta(
                    seconds=random.randint(0, 365 * 24 * 3600)
                ),
                'student_id': str(uuid4()),
                'section_id': str(uuid4()),
                'course_code': f'{random.choice(["CS", "MATH", "ENG", "BIO", "CHEM"])}-{random.randint(100, 499)}',
                'semester': random.choice(['Fall 2024', 'Spring 2024', 'Fall 2023']),
                'metadata': {
                    'user_id': str(uuid4()),
                    'service': 'academic_service',
                    'correlation_id': str(uuid4()),
                },
            }
            
            events.append(event)
        
        df = pd.DataFrame(events)
        
        logger.info("Events generated", count=len(df))
        
        return df
    
    def generate_course_sections(self, num_sections: int = 500) -> pd.DataFrame:
        """
        Generate synthetic course sections.
        
        Args:
            num_sections: Number of sections to generate
            
        Returns:
            DataFrame with section data
        """
        logger.info("Generating course sections", count=num_sections)
        
        departments = ['Computer Science', 'Mathematics', 'Engineering', 'Biology', 'Chemistry']
        days_options = [
            ['Monday', 'Wednesday', 'Friday'],
            ['Tuesday', 'Thursday'],
            ['Monday', 'Wednesday'],
            ['Tuesday', 'Thursday', 'Friday'],
        ]
        
        sections = []
        
        for i in range(num_sections):
            course_num = random.randint(100, 499)
            dept_code = random.choice(['CS', 'MATH', 'ENG', 'BIO', 'CHEM'])
            
            section = {
                'section_id': str(uuid4()),
                'course_id': str(uuid4()),
                'course_code': f'{dept_code}-{course_num}',
                'section_number': f'{random.randint(1, 5):03d}',
                'semester': random.choice(['Fall 2024', 'Spring 2025']),
                'department': random.choice(departments),
                'instructor_id': str(uuid4()),
                
                # Schedule
                'schedule_days': random.choice(days_options),
                'start_time': f'{random.randint(8, 16):02d}:00',
                'end_time': f'{random.randint(9, 18):02d}:00',
                
                # Capacity
                'max_enrollment': random.randint(20, 200),
                'current_enrollment': 0,  # Will be filled based on enrollments
                
                # Room assignment
                'room_id': str(uuid4()),
                'room_capacity': random.randint(25, 250),
                'building': random.choice(['North Hall', 'Science Building', 'Engineering Complex']),
            }
            
            # Set current enrollment to realistic level
            section['current_enrollment'] = random.randint(
                int(section['max_enrollment'] * 0.3),
                min(section['max_enrollment'], int(section['max_enrollment'] * 0.95))
            )
            
            sections.append(section)
        
        df = pd.DataFrame(sections)
        
        logger.info("Sections generated", count=len(df))
        
        return df
    
    def save_datasets(self, output_dir: str = 'ml/datasets/generated') -> None:
        """
        Generate and save all datasets.
        
        Args:
            output_dir: Output directory for datasets
        """
        from pathlib import Path
        
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info("Generating all datasets", output_dir=output_dir)
        
        # Generate datasets
        students = self.generate_student_data(10000)
        events = self.generate_enrollment_events(100000)
        sections = self.generate_course_sections(500)
        
        # Save to CSV
        students.to_csv(f'{output_dir}/students.csv', index=False)
        events.to_csv(f'{output_dir}/enrollment_events.csv', index=False)
        sections.to_csv(f'{output_dir}/course_sections.csv', index=False)
        
        logger.info(
            "All datasets saved",
            students=len(students),
            events=len(events),
            sections=len(sections),
        )
        
        print(f"\n✅ Datasets generated and saved to {output_dir}/")
        print(f"   - students.csv: {len(students)} records")
        print(f"   - enrollment_events.csv: {len(events)} records")
        print(f"   - course_sections.csv: {len(sections)} records")
        print(f"\n📊 Total records: {len(students) + len(events) + len(sections)}")


# CLI interface
if __name__ == '__main__':
    generator = SyntheticDataGenerator(seed=42)
    generator.save_datasets()

